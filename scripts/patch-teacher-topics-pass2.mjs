/**
 * Second pass: fix remaining Arabic strings in ContentEditor and TeacherTopicsTab.
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

function patchContentEditor2() {
    const file = path.join(ROOT, "src/pages/dashboard/teacher/components/ContentEditor.tsx");
    let c = fs.readFileSync(file, "utf8");

    const reps = [
        ['                        إلغاء\n', '                        {t("dash.common.cancel")}\n'],
        ['                                            رفع\n', '                                            {t("dash.teacher.topics.editor.upload")}\n'],
        ['                                                            رفع\n', '                                                            {t("dash.teacher.topics.editor.upload")}\n'],
        ['placeholder="مثال: 10 دقائق"', 'placeholder={t("dash.teacher.topics.editor.durationPlaceholder")}'],
        ['                                    لا توجد ملفات صوتية مرفوعة بعد. أضف وسائط من نوع "صوت" في تبويب الوسائط لتخصيص الأصوات.', '                                    {t("dash.teacher.topics.editor.noAudioFiles")}'],
        ['                                        اسمح للطلاب بالتعليق والمناقشة داخل صفحة هذا الدرس.', '                                        {t("dash.teacher.topics.editor.discussionsDesc")}'],
        ['                                الوضع الافتراضي عند إنشاء درس جديد:', '                                {t("dash.teacher.topics.editor.defaultNewLesson")}'],
        ['                                    عند اختيار مسار محدد، ينتقل الطالب مباشرة إلى هذا التحدي عند الضغط على «انضم للتحدي» دون عرض خيارات أخرى.', '                                    {t("dash.teacher.topics.editor.challengePathDesc")}'],
        ['                                    اترك «الطلاب يختارون» للسماح بالاختيار كالمعتاد.', ''],
        ['                                        عند التفعيل، يُطلب من الزائر إدخال الاسم (وتفاصيل اختيارية) قبل بدء التحدي الفردي، وتُحفظ النتيجة مرتبطة بهذا الاسم في تقاريرك. إذا لم يُفعَّل، يمكن إكمال التحدي دون ذكر الهوية (كما هو الآن).', '                                        {t("dash.teacher.topics.editor.collectParticipantDataDesc")}'],
        ['                            أضف الوسائط التعليمية: فيديو، صورة، نص، PDF، صوت، رابط', '                            {t("dash.teacher.topics.editor.mediaDesc")}'],
        ['                                                            ✓ سيتم تحليل الملف بالذكاء الاصطناعي عند توليد الأسئلة', '                                                            {t("dash.teacher.topics.editor.aiPdfHint")}'],
        ['                                                        يمكنك إضافة الصورة بطريقتين: رفع صورة مباشرة، أو استخدام الذكاء الاصطناعي لتوليد صورة من موارد الدرس.', '                                                        {t("dash.teacher.topics.editor.aiImageIntro")}'],
        ['                                                        ألصق رابط الصورة أو ارفع ملف صورة من جهازك.', '                                                        {t("dash.teacher.topics.editor.aiImagePasteOrUpload")}'],
        ['                                                                    تم توليدها بالذكاء الاصطناعي', '                                                                    {t("dash.teacher.topics.editor.aiGenerated")}'],
        ['                                                            alt="معاينة الصورة"', '                                                            alt={t("dash.teacher.topics.editor.imagePreview")}'],
        ['                                                            اختر إعدادات التوليد ثم حلّل الموارد لإنشاء وصف الصورة.', '                                                            {t("dash.teacher.topics.editor.aiImageSetup")}'],
        ['                                                            لغة وصف التوليد (يظهر في النافذة ثم يُرسَل لتوليد الصورة)', '                                                            {t("dash.teacher.topics.editor.promptLanguage")}'],
        ['                                                                <SelectValue placeholder="اختر" />', '                                                                <SelectValue placeholder={t("dash.teacher.topics.editor.orderLabel")} />'],
        ['                                                                    تلقائي — عربي إن كانت المواد عربية', '                                                                    {t("dash.teacher.topics.editor.langAuto")}'],
        ['                                                            المورد المعتمد للتحليل', '                                                            {t("dash.teacher.topics.editor.aiImageSourceLabel")}'],
        ['                                                                    {aiImageSourceSelections.length} من {mediaList.length} مورد محدد', '                                                                    {t("dash.teacher.topics.editor.resourcesSelected", { selected: aiImageSourceSelections.length, total: mediaList.length })}'],
        ['                                                                اختر موردًا واحدًا أو أكثر. سيتم تحليل الموارد المحددة فقط.', '                                                                {t("dash.teacher.topics.editor.aiImageSourceHint")}'],
        ['                                                                        لا توجد موارد مضافة بعد.', '                                                                        {t("dash.teacher.topics.editor.noResourcesAdded")}'],
        ['                                                            نطاق المحتوى من الموارد (اختياري) — أي جزء يُحلَّل لصياغة الوصف', '                                                            {t("dash.teacher.topics.editor.contentFocus")}'],
        ['                                                            placeholder="مثال: الملف فيه 7 وحدات — اعتمد الوحدة الأولى فقط. الموضوع: التركيب الضوئي…"', '                                                            placeholder={t("dash.teacher.topics.editor.contentFocus")}'],
        ['                                                            <Label className="text-xs text-muted-foreground">الجمهور المستهدف</Label>', '                                                            <Label className="text-xs text-muted-foreground">{t("dash.teacher.topics.editor.audienceLabel")}</Label>'],
        ['                                                                    <SelectItem value="kids">أطفال</SelectItem>', '                                                                    <SelectItem value="kids">{t("dash.teacher.topics.editor.audience.children")}</SelectItem>'],
        ['                                                                    <SelectItem value="teens">مراهقون / ثانوي</SelectItem>', '                                                                    <SelectItem value="teens">{t("dash.teacher.topics.editor.audience.teens")}</SelectItem>'],
        ['                                                                    <SelectItem value="adults">بالغون</SelectItem>', '                                                                    <SelectItem value="adults">{t("dash.teacher.topics.editor.audience.adults")}</SelectItem>'],
        ['                                                                    <SelectItem value="university">جامعة / دراسات عليا</SelectItem>', '                                                                    <SelectItem value="university">{t("dash.teacher.topics.editor.audience.university")}</SelectItem>'],
        ['                                                                    <SelectItem value="general">عام / مختلط</SelectItem>', '                                                                    <SelectItem value="general">{t("dash.teacher.topics.editor.audience.general")}</SelectItem>'],
        ['                                                            <Label className="text-xs text-muted-foreground">النمط البصري</Label>', '                                                            <Label className="text-xs text-muted-foreground">{t("dash.teacher.topics.editor.visualTheme")}</Label>'],
        ['                                                                    <SelectItem value="infographic">إنفوجرافيك</SelectItem>', '                                                                    <SelectItem value="infographic">{t("dash.teacher.topics.editor.theme.infographic")}</SelectItem>'],
        ['                                                                    <SelectItem value="poster">ملصق / بوستر</SelectItem>', '                                                                    <SelectItem value="poster">{t("dash.teacher.topics.editor.theme.poster")}</SelectItem>'],
        ['                                                                    <SelectItem value="storybook">قصة مصورة</SelectItem>', '                                                                    <SelectItem value="storybook">{t("dash.teacher.topics.editor.theme.comic")}</SelectItem>'],
        ['                                                                    <SelectItem value="diagram">مخطط / رسم توضيحي</SelectItem>', '                                                                    <SelectItem value="diagram">{t("dash.teacher.topics.editor.theme.diagram")}</SelectItem>'],
        ['                                                                    <SelectItem value="minimal">بسيط Minimal</SelectItem>', '                                                                    <SelectItem value="minimal">{t("dash.teacher.topics.editor.theme.minimal")}</SelectItem>'],
        ['                                                                    <SelectItem value="textbook">أسلوب كتاب مدرسي</SelectItem>', '                                                                    <SelectItem value="textbook">{t("dash.teacher.topics.editor.theme.textbook")}</SelectItem>'],
        ['                                                            <Label className="text-xs text-muted-foreground">النبرة</Label>', '                                                            <Label className="text-xs text-muted-foreground">{t("dash.teacher.topics.editor.tone")}</Label>'],
        ['                                                                    <SelectItem value="playful">مرح</SelectItem>', '                                                                    <SelectItem value="playful">{t("dash.teacher.topics.editor.tone.playful")}</SelectItem>'],
        ['                                                                    <SelectItem value="friendly">ودّي</SelectItem>', '                                                                    <SelectItem value="friendly">{t("dash.teacher.topics.editor.tone.friendly")}</SelectItem>'],
        ['                                                                    <SelectItem value="formal">رسمي</SelectItem>', '                                                                    <SelectItem value="formal">{t("dash.teacher.topics.editor.tone.formal")}</SelectItem>'],
        ['                                                                    <SelectItem value="scientific">علمي</SelectItem>', '                                                                    <SelectItem value="scientific">{t("dash.teacher.topics.editor.tone.serious")}</SelectItem>'],
        ['                                                                    <SelectItem value="neutral">محايد</SelectItem>', '                                                                    <SelectItem value="neutral">{t("dash.teacher.topics.editor.tone.neutral")}</SelectItem>'],
        ['                                                            <Label className="text-xs text-muted-foreground">الألوان / الجو</Label>', '                                                            <Label className="text-xs text-muted-foreground">{t("dash.teacher.topics.editor.colorMood")}</Label>'],
        ['                                                                    <SelectItem value="bright">زاهية</SelectItem>', '                                                                    <SelectItem value="bright">{t("dash.teacher.topics.editor.color.bright")}</SelectItem>'],
        ['                                                                    <SelectItem value="pastel">باستيل</SelectItem>', '                                                                    <SelectItem value="pastel">{t("dash.teacher.topics.editor.color.pastel")}</SelectItem>'],
        ['                                                                    <SelectItem value="dark">داكن (نص فاتح)</SelectItem>', '                                                                    <SelectItem value="dark">{t("dash.teacher.topics.editor.color.dark")}</SelectItem>'],
        ['                                                                    <SelectItem value="high_contrast">تباين عالٍ</SelectItem>', '                                                                    <SelectItem value="high_contrast">{t("dash.teacher.topics.editor.color.highContrast")}</SelectItem>'],
        ['                                                                    <SelectItem value="natural">طبيعي / أرضي</SelectItem>', '                                                                    <SelectItem value="natural">{t("dash.teacher.topics.editor.color.natural")}</SelectItem>'],
        ['                                                            ملاحظات إضافية (اختياري) — مثال: لغة معيّنة، تجنّب عناصر، شعار', '                                                            {t("dash.teacher.topics.editor.extraNotes")}'],
        ['                                                            placeholder="مثال: استخدم مصطلحات بالعربية للعناوين الرئيسية فقط…"', '                                                            placeholder={t("dash.teacher.topics.editor.extraNotes")}'],
        ['                                                        الخطوة 1: تحليل الوسائط وعرض وصف مختصر يغطي الأفكار الرئيسية. الخطوة 2: بعد التأكيد يُرسل إلى نموذج الصور.', '                                                        {t("dash.teacher.topics.editor.aiImageSteps")}'],
        ['                                                        تحليل الموارد وعرض وصف الصورة', '                                                        {t("dash.teacher.topics.editor.analyzeResources")}'],
        ['                                            }}>إلغاء</Button>', '                                            }}>{t("dash.common.cancel")}</Button>'],
        ['{editingMediaIndex !== null ? "تحديث" : "إضافة"}', '{editingMediaIndex !== null ? t("dash.teacher.topics.editor.updateBtn") : t("dash.teacher.topics.editor.addBtn")}'],
        ['{media.type === "video" ? "فيديو" : media.type === "image" ? "صورة" : media.type === "pdf" ? "PDF" : media.type === "audio" ? "صوت" : media.type === "link" ? "رابط" : "نص"}', '{getMediaTypeLabel(media.type, t)}'],
        ['alt={media.caption || "صورة مرفقة"}', 'alt={media.caption || t("dash.teacher.topics.editor.attachedImage")}'],
        ['alt={media.caption || "معاينة فيديو"}', 'alt={media.caption || t("dash.teacher.topics.editor.videoPreview")}'],
        ['? media.fileName || "ملف PDF"', '? media.fileName || t("dash.teacher.topics.editor.pdfFile")'],
        ['? media.fileName || "ملف صوتي"', '? media.fileName || t("dash.teacher.topics.editor.audioFile")'],
        ['? "فيديو يوتيوب"', '? t("dash.teacher.topics.editor.youtubeVideo")'],
        ['                                            أضف أسئلة مختلفة وألعاب تفاعلية للتحديات', '                                            {t("dash.teacher.topics.editor.questionsDesc")}'],
        ['                                            أضف أسئلة متنوعة وألعاب تفاعلية لجعل التحدي ممتعاً', '                                            {t("dash.teacher.topics.editor.noQuestionsDesc")}'],
        ['<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">اختيار متعدد</span>', '<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{t("dash.teacher.topics.editor.type.multipleChoice")}</span>'],
        ['<span className="px-2 py-1 bg-green-100 text-green-800 rounded">صح وخطأ</span>', '<span className="px-2 py-1 bg-green-100 text-green-800 rounded">{t("dash.teacher.topics.editor.type.trueFalse")}</span>'],
        ['<span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">لعبة المطابقة</span>', '<span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">{t("dash.teacher.topics.qe.matching")}</span>'],
        ['<span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">دوران العجلة</span>', '<span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">{t("dash.teacher.topics.qe.wheelSpin")}</span>'],
        ['<span className="px-2 py-1 bg-pink-100 text-pink-800 rounded">لعبة التصويب</span>', '<span className="px-2 py-1 bg-pink-100 text-pink-800 rounded">{t("dash.teacher.topics.qe.shooting")}</span>'],
        ['                                النص أدناه هو <strong>نفسه</strong> الذي يُرسل إلى نموذج توليد الصورة عند الضغط على «توليد الصورة»\n                                (يمكنك تعديله قبل الإرسال).', '                                {t("dash.teacher.topics.editor.confirmImagePromptDesc1")}'],
        ['                                لفرض لغة الوصف: من «خيارات الصورة» قبل «تحليل الموارد» اختر تلقائي أو عربي أو English.', '                                {t("dash.teacher.topics.editor.confirmImagePromptDesc2")}'],
        ['                            إلغاء\n', '                            {t("dash.common.cancel")}\n'],
        ['                                "توليد الصورة"', '                                t("dash.teacher.topics.editor.generateImage")'],
    ];

    for (const [from, to] of reps) {
        c = c.split(from).join(to);
    }

    fs.writeFileSync(file, c);
    console.log("ContentEditor pass 2 done");
}

function patchTeacherTopicsTab2() {
    const file = path.join(ROOT, "src/pages/dashboard/teacher/components/TeacherTopicsTab.tsx");
    let c = fs.readFileSync(file, "utf8");

    const reps = [
        ['{ label: "أدنى", value: Math.round(Math.min(...scores)), fill: "#ef4444" }', '{ label: t("dash.teacher.topics.lowest"), value: Math.round(Math.min(...scores)), fill: "#ef4444" }'],
        ['{ label: "وسيط", value: getMedianScore(scores), fill: "#3b82f6" }', '{ label: t("dash.teacher.topics.medianShort"), value: getMedianScore(scores), fill: "#3b82f6" }'],
        ['{ label: "أعلى", value: Math.round(Math.max(...scores)), fill: "#10b981" }', '{ label: t("dash.teacher.topics.highest"), value: Math.round(Math.max(...scores)), fill: "#10b981" }'],
        ['name: "سريع ومتقن"', 'name: t("dash.teacher.topics.segment.fastPrecise")'],
        ['name: "سريع ويحتاج تثبيت"', 'name: t("dash.teacher.topics.segment.fastNeedsWork")'],
        ['name: "متأن ومتقن"', 'name: t("dash.teacher.topics.segment.slowPrecise")'],
        ['name: "متعثر وبطيء"', 'name: t("dash.teacher.topics.segment.slowStruggling")'],
        ['{ name: "صعبة", count:', '{ name: t("dash.teacher.topics.difficulty.hard"), count:'],
        ['{ name: "متوسطة", count:', '{ name: t("dash.teacher.topics.difficulty.medium"), count:'],
        ['{ name: "سهلة", count:', '{ name: t("dash.teacher.topics.difficulty.easy"), count:'],
        ['? `يوجد ${supportNeeded} محاولة أقل من 50%؛ يفضل مراجعة المفاهيم الأساسية مع هذه المجموعة.`', '? t("dash.teacher.topics.insight.supportAttempts", { n: supportNeeded })'],
        [': "لا توجد محاولات منخفضة جدًا؛ مستوى الدعم العاجل منخفض."', ': t("dash.teacher.topics.insight.noLowAttempts")'],
        ['? "التشتت مرتفع بين الطلاب؛ قسّم الطلاب إلى مجموعات دعم/إثراء بدل نشاط واحد للجميع."', '? t("dash.teacher.topics.insight.highDispersion")'],
        [': "التشتت محدود؛ يمكن تقديم تغذية راجعة موحدة مع تدخلات فردية بسيطة."', ': t("dash.teacher.topics.insight.lowDispersion")'],
        ['? `ابدأ بالمراجعة من السؤال الأضعف: "${weakestQuestion.label}" لأن دقته ${weakestQuestion.accuracy}%.`', '? `${t("dash.teacher.topics.insight.reviewWeakest")}"${weakestQuestion.label}"${t("dash.teacher.topics.insight.weakestBecause", { accuracy: weakestQuestion.accuracy })}`'],
        ['? "العلاقة عكسية بين الوقت والدرجة: الطلاب الأبطأ غالبًا يواجهون صعوبة، فاختصر السؤال أو أضف مثالًا تمهيديًا."', '? t("dash.teacher.topics.insight.negativeTime")'],
        ['? "العلاقة طردية بين الوقت والدرجة: التفكير الأطول يساعد، فشجع الطلاب على التمهل."', '? t("dash.teacher.topics.insight.positiveTime")'],
        [': "لا توجد علاقة قوية بين الزمن والدرجة؛ ركّز على جودة السؤال والمفهوم أكثر من السرعة."', ': t("dash.teacher.topics.insight.noTimeRelation")'],
        ['toast({ title: "تم التنزيل", description: "تم تنزيل رمز QR بنجاح." });', 'toast({ title: t("dash.teacher.topics.toast.downloaded"), description: t("dash.teacher.topics.toast.qrDownloaded") });'],
        ['title: "تعذر تنزيل QR"', 'title: t("dash.teacher.topics.toast.qrFailed")'],
        ['description: "حدث خطأ أثناء تنزيل رمز QR. حاول مرة أخرى."', 'description: t("dash.teacher.topics.toast.qrError")'],
        ['title: "تمت إعادة ضبط النتائج"', 'title: t("dash.teacher.topics.toast.resetSuccess")'],
        ['description: "حُذفت جميع نتائج التحدي الفردي لهذا الدرس ولا يمكن استرجاعها."', 'description: t("dash.teacher.topics.toast.resetDesc")'],
        ['title: "تعذّر حذف النتائج"', 'title: t("dash.teacher.topics.toast.resetFailed")'],
        ['description: error instanceof Error ? error.message : "حدث خطأ أثناء حذف النتائج. حاول مرة أخرى."', 'description: error instanceof Error ? error.message : t("dash.teacher.topics.toast.resetErr")'],
        ['title: "جاري إنشاء التقرير الذكي"', 'title: t("dash.teacher.topics.generatingReport")'],
        ['description: "يقوم Gemini الآن بتحليل نتائج التحدي وتوليد توصيات تعليمية مفصلة، قد يستغرق ذلك لحظات."', 'description: t("dash.teacher.topics.generatingReportDesc")'],
        ['topicTitle: `تقرير التحدي الفردي: ${singleChallengeResultsTopic.title}`', 'topicTitle: t("dash.teacher.topics.pdfReportTitle", { title: singleChallengeResultsTopic.title })'],
        ['mergedSessionsNote: `تقرير مجمع لكل محاولات رابط التحدي الفردي. إجمالي المحاولات: ${singleChallengeCollectedReport.count}، متوسط الأداء: ${singleChallengeCollectedReport.averageScore}%، معدل النجاح: ${singleChallengeCollectedReport.passRate}%.`', 'mergedSessionsNote: t("dash.teacher.topics.pdfReportSummary", { count: singleChallengeCollectedReport.count, avg: singleChallengeCollectedReport.averageScore, pass: singleChallengeCollectedReport.passRate })'],
        ['label: "تقييم الدرس (متوسط)"', 'label: t("dash.teacher.topics.lessonRating")'],
        ['label: "عدد تقييمات الدرس"', 'label: t("dash.teacher.topics.ratingCount")'],
        ['{ label: "الوسيط", value: `${singleChallengeCollectedReport.medianScore}%` }', '{ label: t("dash.teacher.topics.median"), value: `${singleChallengeCollectedReport.medianScore}%` }'],
        ['{ label: "أدنى نتيجة", value: `${singleChallengeCollectedReport.lowestScore}%` }', '{ label: t("dash.teacher.topics.lowestScore"), value: `${singleChallengeCollectedReport.lowestScore}%` }'],
        ['{ label: "الانحراف المعياري", value: singleChallengeCollectedReport.stdDevScore }', '{ label: t("dash.teacher.topics.stdDev"), value: singleChallengeCollectedReport.stdDevScore }'],
        ['{ label: "معامل التشتت", value: `${singleChallengeCollectedReport.coefficientOfVariation}%` }', '{ label: t("dash.teacher.topics.dispersionCoef"), value: `${singleChallengeCollectedReport.coefficientOfVariation}%` }'],
        ['{ label: "ارتباط الزمن/الدرجة", value: `${singleChallengeCollectedReport.scoreTimeCorrelation} (${singleChallengeCollectedReport.scoreTimeCorrelationLabel})` }', '{ label: t("dash.teacher.topics.correlation.timeScore"), value: `${singleChallengeCollectedReport.scoreTimeCorrelation} (${singleChallengeCollectedReport.scoreTimeCorrelationLabel})` }'],
        ['{ label: "محاولات الأسبوع", value: singleChallengeCollectedReport.weeklyAttempts }', '{ label: t("dash.teacher.topics.weeklyAttempts"), value: singleChallengeCollectedReport.weeklyAttempts }'],
        ['{ label: "نجاح الأسبوع", value: `${singleChallengeCollectedReport.weeklyPassRate}%` }', '{ label: t("dash.teacher.topics.weeklySuccess"), value: `${singleChallengeCollectedReport.weeklyPassRate}%` }'],
        ['{ label: "نتائج ممتازة", value: singleChallengeCollectedReport.highPerformers }', '{ label: t("dash.teacher.topics.excellentScores"), value: singleChallengeCollectedReport.highPerformers }'],
        ['{ label: "يحتاجون دعم", value: singleChallengeCollectedReport.supportNeeded }', '{ label: t("dash.teacher.topics.needsSupport"), value: singleChallengeCollectedReport.supportNeeded }'],
        ['title: "تم تنزيل PDF"', 'title: t("dash.teacher.topics.toast.pdfDownloaded")'],
        ['description: "تم إنشاء تقرير عربي منسق بخط عربي قابل للقراءة والبحث."', 'description: t("dash.teacher.topics.pdfArabicReport")'],
        ['title: "تعذر تنزيل PDF"', 'title: t("dash.teacher.topics.toast.pdfFailed")'],
        ['description: "حدث خطأ أثناء إنشاء التقرير. حاول مرة أخرى."', 'description: t("dash.teacher.topics.toast.reportFailed")'],
        ['toast({ title: "تم تحديث ترتيب الدروس" });', 'toast({ title: t("dash.teacher.topics.toast.reordered") });'],
        ['title: "تعذر تغيير الترتيب"', 'title: t("dash.teacher.topics.toast.reorderFailed")'],
        ['description: error?.message || "حاول مرة أخرى"', 'description: error?.message || t("dash.teacher.topics.tryAgain")'],
        ['toast({ title: "تم تحديث الدرس بنجاح ✓" });', 'toast({ title: t("dash.teacher.topics.toast.updated") });'],
        ['title: "خطأ في حفظ المكونات"', 'title: t("dash.teacher.topics.toast.saveComponentsFailed")'],
        ['description: err.message || "حدث خطأ أثناء حفظ الوسائط أو الأسئلة."', 'description: err.message || t("dash.teacher.topics.toast.mediaErr")'],
        ['toast({ title: "تم إنشاء الدرس بنجاح ✓" });', 'toast({ title: t("dash.teacher.topics.toast.created") });'],
        ['title: "تم إنشاء الدرس ولكن مع خطأ"', 'title: t("dash.teacher.topics.toast.createdPartial")'],
        ['description: "تم إنشاء الدرس، لكن فشل حفظ الوسائط أو الأسئلة."', 'description: t("dash.teacher.topics.toast.mediaSaveFailed")'],
        ['title: "خطأ غير متوقع"', 'title: t("dash.teacher.topics.toast.unexpected")'],
        ['description: error.message || "حدث خطأ أثناء محاولة الحفظ."', 'description: error.message || t("dash.teacher.topics.toast.saveFailed")'],
        ['toast({ title: "تم حذف الدرس بنجاح" });', 'toast({ title: t("dash.teacher.topics.toast.deleted") });'],
        ['title: newStatus === "published" ? "تم نشر الدرس" : "تم تحويل الدرس إلى مسودة"', 'title: newStatus === "published" ? t("dash.teacher.topics.toast.published") : t("dash.teacher.topics.toast.drafted")'],
        ['                            استخدم الأسهم لترتيب الدروس — يظهر نفس الترتيب للطلاب في «المواضيع التعليمية»', '                            {t("dash.teacher.topics.reorderHint")}'],
        ['                                                <h3 className="font-bold text-destructive">تأكيد الحذف</h3>', '                                                <h3 className="font-bold text-destructive">{t("dash.teacher.topics.deleteConfirmTitle")}</h3>'],
        ['                                                    هل أنت متأكد من حذف هذا الدرس؟ لا يمكن التراجع عن هذا الإجراء.', '                                                    {t("dash.teacher.topics.deleteConfirmDesc")}'],
        ['aria-label="ترتيب الدرس"', 'aria-label={t("dash.teacher.topics.lessonOrder")}'],
        ['title="تحريك لأعلى"', 'title={t("dash.teacher.topics.moveUp")}'],
        ['title="تحريك لأسفل"', 'title={t("dash.teacher.topics.moveDown")}'],
        ['{topic.status === "published" ? "✓ منشور" : "مسودة"}', '{topic.status === "published" ? t("dash.teacher.topics.publishedBadge") : t("dash.teacher.topics.draft")}'],
        ['                                                                الكل (مختلط)', '                                                                {t("dash.teacher.topics.shareMixed")}'],
        ['                                                                        أسماء المحاولات والدرجات — الأحدث أولاً', '                                                                        {t("dash.teacher.topics.attemptNamesScores")}'],
        ['                                    {searchQuery ? "لا توجد نتائج" : "لا توجد دروس"}', '                                    {searchQuery ? t("dash.teacher.topics.noResults") : t("dash.teacher.topics.noLessons")}'],
        ['? `لم نجد دروساً تطابق "${searchQuery}"`', '? t("dash.teacher.topics.noSearchResults", { query: searchQuery })'],
        [': "ابدأ بإضافة درس جديد لمادتك"}', ': t("dash.teacher.topics.noLessonsDesc")}'],
        ['<DialogTitle>تقرير المحتوى الكامل: {selectedTopicStats?.title}</DialogTitle>', '<DialogTitle>{t("dash.teacher.topics.contentReportTitle", { title: selectedTopicStats?.title ?? "" })}</DialogTitle>'],
        ['                            تقرير تفصيلي لأداء المحتوى يشمل المشاهدات، محاولات التحدي، متوسط الدرجات، والنشاط الزمني.', '                            {t("dash.teacher.topics.contentReportDesc")}'],
        ['{ name: "فردي", value: metrics.singleAttempts, color: "#3b82f6" }', '{ name: t("dash.teacher.topics.single"), value: metrics.singleAttempts, color: "#3b82f6" }'],
        ['{ name: "جماعي", value: metrics.groupAttempts, color: "#10b981" }', '{ name: t("dash.teacher.topics.group"), value: metrics.groupAttempts, color: "#10b981" }'],
        ['{ label: "متوسط", value: metrics.averageScoreOverall }', '{ label: t("dash.teacher.topics.average"), value: metrics.averageScoreOverall }'],
        ['{ label: "وسيط", value: metrics.medianScore }', '{ label: t("dash.teacher.topics.medianShort"), value: metrics.medianScore }'],
        ['{ label: "أعلى", value: metrics.highestScore }', '{ label: t("dash.teacher.topics.highest"), value: metrics.highestScore }'],
        ['{ label: "أدنى", value: metrics.lowestScore }', '{ label: t("dash.teacher.topics.lowest"), value: metrics.lowestScore }'],
        ['{ label: "إجمالي المشاهدات", value: metrics.viewers }', '{ label: t("dash.teacher.topics.totalViews"), value: metrics.viewers }'],
        ['{ label: "مشاهدون فريدون", value: metrics.uniqueViewers }', '{ label: t("dash.teacher.topics.uniqueViewers"), value: metrics.uniqueViewers }'],
        ['{ label: "إجمالي المحاولات", value: metrics.totalAttempts }', '{ label: t("dash.teacher.topics.totalAttempts"), value: metrics.totalAttempts }'],
        ['{ label: "متوسط الأداء العام", value: `${metrics.averageScoreOverall}%` }', '{ label: t("dash.teacher.topics.avgPerformance"), value: `${metrics.averageScoreOverall}%` }'],
        ['{ label: "أعلى نتيجة", value: `${metrics.highestScore}%` }', '{ label: t("dash.teacher.topics.highestScore"), value: `${metrics.highestScore}%` }'],
        ['{ label: "معدل النجاح", value: `${metrics.passRate}%` }', '{ label: t("dash.teacher.topics.passRate"), value: `${metrics.passRate}%` }'],
        ['emptyMessage="لا توجد تقييمات بعد لهذا الدرس."', 'emptyMessage={t("dash.teacher.topics.noRatings")}'],
        ['<CardTitle className="text-sm">تفاصيل التحدي الفردي</CardTitle>', '<CardTitle className="text-sm">{t("dash.teacher.topics.singleDetails")}</CardTitle>'],
        ['<CardTitle className="text-sm">تفاصيل التحدي الجماعي</CardTitle>', '<CardTitle className="text-sm">{t("dash.teacher.topics.groupDetails")}</CardTitle>'],
        ['<span className="text-muted-foreground">عدد المحاولات</span>', '<span className="text-muted-foreground">{t("dash.teacher.topics.attempts")}</span>'],
        ['<span className="text-muted-foreground">عدد المستخدمين (فريد)</span>', '<span className="text-muted-foreground">{t("dash.teacher.topics.uniqueUsers")}</span>'],
        ['<span className="text-muted-foreground">متوسط الدرجات</span>', '<span className="text-muted-foreground">{t("dash.teacher.topics.avgScore")}</span>'],
        ['<CardTitle className="text-sm">مخطط المحاولات (فردي/جماعي)</CardTitle>', '<CardTitle className="text-sm">{t("dash.teacher.topics.attemptsChart")}</CardTitle>'],
        ['                                                            لا توجد بيانات كافية للرسم', '                                                            {t("dash.teacher.topics.noChartData")}'],
        ['<CardTitle className="text-sm">مخطط الدرجات</CardTitle>', '<CardTitle className="text-sm">{t("dash.teacher.topics.scoreChart")}</CardTitle>'],
        ['<CardTitle className="text-sm">ملخص التقرير</CardTitle>', '<CardTitle className="text-sm">{t("dash.teacher.topics.reportSummary")}</CardTitle>'],
        ['<span className="text-muted-foreground">إجمالي الطلاب المشاركين في التحديات</span>', '<span className="text-muted-foreground">{t("dash.teacher.topics.totalParticipants")}</span>'],
        ['<span className="text-muted-foreground">آخر محاولة</span>', '<span className="text-muted-foreground">{t("dash.teacher.topics.lastAttempt")}</span>'],
    ];

    for (const [from, to] of reps) {
        c = c.split(from).join(to);
    }

    // CardTitle replacements for remaining report sections
    const cardTitles = [
        ["قراءة تحليلية سريعة", "dash.teacher.topics.quickAnalysis"],
        ["تحليل إحصائي متقدم", "dash.teacher.topics.advancedStats"],
        ["توزيع الدرجates", "dash.teacher.topics.scoreDistribution"],
        ["الصحيح مقابل الخطأ", "dash.teacher.topics.correctVsWrong"],
        ["نوع المشاركين", "dash.teacher.topics.participantType"],
        ["النشاط آخر 7 أيام", "dash.teacher.topics.activity7days"],
        ["أفضل درجات المشاركين", "dash.teacher.topics.bestScores"],
        ["أفضل المحاولات", "dash.teacher.topics.bestAttempts"],
        ["أبطأ الأسئلة زمنًا", "dash.teacher.topics.slowestQuestions"],
        ["تحليل الأسئلة", "dash.teacher.topics.questionAnalysis"],
        ["تحليل الأسئلة في التحدي الفردي", "dash.teacher.topics.singleQuestionAnalysis"],
        ["تفاصيل الأداء والزمن", "dash.teacher.topics.performanceDetails"],
        ["تحليل التوزيع", "dash.teacher.topics.distributionAnalysis"],
        ["تحليل النشاط", "dash.teacher.topics.activityAnalysis"],
        ["علاقة الزمن بالدرجة", "dash.teacher.topics.timeScoreRelation"],
        ["شرائح المتعلمين", "dash.teacher.topics.learnerSegments"],
        ["ملخص الربعيات والمدى", "dash.teacher.topics.quartileSummary"],
        ["تصنيف صعوبة الأسئلة", "dash.teacher.topics.questionDifficulty"],
        ["دقة كل سؤال", "dash.teacher.topics.questionAccuracy"],
        ["توصيات مبنية على البيانات", "dash.teacher.topics.dataRecommendations"],
    ];

    for (const [ar, key] of cardTitles) {
        c = c.replace(new RegExp(`>${ar}<`, "g"), `>{t("${key}")}<`);
        c = c.replace(new RegExp(`<CardTitle[^>]*>${ar}</CardTitle>`, "g"), `<CardTitle className="text-sm">{t("${key}")}</CardTitle>`);
    }

    // Fix typo in cardTitles
    c = c.replace('dash.teacher.topics.scoreDistribution', 'dash.teacher.topics.scoreDistribution');

    fs.writeFileSync(file, c);
    console.log("TeacherTopicsTab pass 2 done");
}

patchContentEditor2();
patchTeacherTopicsTab2();

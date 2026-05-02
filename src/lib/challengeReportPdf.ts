/**
 * تقرير PDF عربي احترافي — نص حقيقي (قابل للنسخ والبحث).
 *
 * يعتمد على: https://github.com/tilix-ir/jspdf-rtl-support
 * الخط: Noto Sans Arabic (OFL) — `public/fonts/`
 */
import { jsPDF } from "jspdf";
import { RtlRichTextPrinter } from "jspdf-rtl-support";
import type { ChallengeReportCsvOptions } from "./challengeReportDownload";
import { stripHtml } from "./challengeReportDownload";

type PdfDoc = InstanceType<typeof jsPDF>;

const VFS_REG = "NotoSansArabic-Regular.ttf";
const VFS_BOLD = "NotoSansArabic-Bold.ttf";
const FONT_FAMILY = "NotoArabic";

const COL = {
    brand: [124, 58, 237] as const,
    brandDark: [91, 33, 182] as const,
    brandTint: [245, 243, 255] as const,
    brandBorder: [233, 213, 255] as const,
    amberTint: [254, 243, 199] as const,
    amberBorder: [251, 191, 36] as const,
    slate: [15, 23, 42] as const,
    muted: [100, 116, 139] as const,
    border: [226, 232, 240] as const,
    rowAlt: [248, 250, 252] as const,
    white: [255, 255, 255] as const,
    questionBg: [250, 245, 255] as const,
    summaryBg: [238, 242, 255] as const,
    tableHead: [241, 245, 249] as const,
};

function fontUrl(filename: string): string {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
    return `${base}fonts/${filename}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function loadFontBase64(path: string): Promise<string> {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`تعذّر تحميل الخط: ${path}`);
    return arrayBufferToBase64(await res.arrayBuffer());
}

function escapeRich(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function setFill(doc: PdfDoc, rgb: readonly [number, number, number]) {
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc: PdfDoc, rgb: readonly [number, number, number]) {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setText(doc: PdfDoc, rgb: readonly [number, number, number]) {
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function refNumber(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const r = Math.floor(Math.random() * 900 + 100);
    return `TR-${y}${m}${day}-${r}`;
}

function computeExecutiveSummary(results: any[]) {
    const list = results || [];
    const n = list.length;
    if (n === 0) {
        return {
            n: 0,
            avgPct: 0,
            avgScore: 0,
            maxScore: 0,
            members: 0,
            guests: 0,
        };
    }
    let sumPct = 0;
    let sumScore = 0;
    let maxScore = 0;
    let members = 0;
    let guests = 0;
    for (const r of list) {
        sumPct += Number(r.percentage) || 0;
        const sc = Number(r.score) || 0;
        sumScore += sc;
        maxScore = Math.max(maxScore, sc);
        if (r.user?.id) members++;
        else guests++;
    }
    return {
        n,
        avgPct: Math.round(sumPct / n),
        avgScore: Math.round(sumScore / n),
        maxScore,
        members,
        guests,
    };
}

export async function downloadChallengeReportPdf(
    opts: ChallengeReportCsvOptions
): Promise<void> {
    const ref = refNumber();
    const [b64Reg, b64Bold] = await Promise.all([
        loadFontBase64(fontUrl("NotoSansArabic-Regular.ttf")),
        loadFontBase64(fontUrl("NotoSansArabic-Bold.ttf")),
    ]);

    const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true,
    });

    doc.setProperties({
        title: `تقرير أداء التحدي — ${opts.topicTitle || ""}`,
        subject: "تقرير أداء تعليمي — تحدي تفاعلي",
        author: "منصة التحديات التعليمية",
        keywords: "تحدي, تقرير, أداء, تعليم",
        creator: "Education Challenge Reports",
    });

    doc.addFileToVFS(VFS_REG, b64Reg);
    doc.addFileToVFS(VFS_BOLD, b64Bold);
    doc.addFont(VFS_REG, FONT_FAMILY, "normal");
    doc.addFont(VFS_BOLD, FONT_FAMILY, "bold");
    doc.setFont(FONT_FAMILY, "normal");

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const maxW = pageW - margin * 2;
    const FOOTER_H = 11;

    const printer = new RtlRichTextPrinter({
        doc,
        maxWidth: maxW,
        lineHeight: 6.4,
        defaultStartX: pageW - margin,
        align: "right",
        justify: false,
        marginTop: margin,
        marginBottom: margin + FOOTER_H,
        footerHeight: FOOTER_H,
        fontName: FONT_FAMILY,
        convertDigitsToPersian: false,
        onPageBreak: (pageNumber: number) => {
            const fy = pageH - 8;
            setDraw(doc, COL.border);
            doc.setLineWidth(0.2);
            doc.line(margin, fy - 4, pageW - margin, fy - 4);
            doc.setFont(FONT_FAMILY, "normal");
            setText(doc, COL.muted);
            doc.setFontSize(7.8);
            try {
                doc.text(`صفحة ${pageNumber}`, pageW / 2, fy, {
                    align: "center",
                    baseline: "middle",
                });
            } catch {
                doc.text(`Page ${pageNumber}`, pageW / 2, fy, { align: "center" });
            }
            setText(doc, COL.slate);
            return margin + 4;
        },
    });

    /* ========== ترويسة التقرير ========== */
    const HEADER_H = 40;
    setFill(doc, COL.brand);
    doc.rect(0, 0, pageW, HEADER_H, "F");
    setFill(doc, COL.brandDark);
    doc.rect(0, HEADER_H - 1.4, pageW, 1.4, "F");

    setText(doc, COL.white);
    printer.setFontSize(11);
    let y = 9;
    y = printer.print("<b>تقرير أداء التحدي التعليمي</b>", { startY: y });
    printer.setFontSize(9);
    y += 1.5;
    y = printer.print("وثيقة تقييم أداء رسمية — نسخة إلكترونية للاطلاع والأرشفة", {
        startY: y,
    });
    printer.setFontSize(12);
    y += 3;
    y = printer.print(`<b>${escapeRich(opts.topicTitle || "—")}</b>`, { startY: y });

    setText(doc, COL.slate);
    y = HEADER_H + 6;

    /* إطار المحتوى */
    const FRAME_TOP = HEADER_H + 1;
    setDraw(doc, COL.border);
    doc.setLineWidth(0.25);
    doc.rect(
        margin * 0.35,
        FRAME_TOP,
        pageW - margin * 0.7,
        pageH - FRAME_TOP - margin * 0.45,
        "S"
    );

    /* رقم المرجع والتعريف */
    printer.setFontSize(8.8);
    setText(doc, COL.muted);
    y = printer.print(`المرجع: <ltr>${ref}</ltr> — نوع الوثيقة: تقرير أداء تحدي تعليمي`, {
        startY: y,
    });
    y += 3;
    setText(doc, COL.slate);

    /* بطاقة التاريخ والوقت */
    const metaParts: string[] = [];
    if (opts.sessionDate) metaParts.push(`تاريخ التقرير: ${escapeRich(opts.sessionDate)}`);
    if (opts.sessionTime && opts.sessionTime !== "—") {
        metaParts.push(`وقت التحدي المسجّل: ${escapeRich(opts.sessionTime)}`);
    }

    if (metaParts.length > 0) {
        const metaH = metaParts.length * 6 + 9;
        setFill(doc, COL.brandTint);
        setDraw(doc, COL.brandBorder);
        doc.setLineWidth(0.35);
        doc.rect(margin, y, pageW - margin * 2, metaH, "FD");

        printer.setFontSize(9.5);
        let innerY = y + 4;
        metaParts.forEach((line, idx) => {
            innerY = printer.print(line, { startY: innerY });
            if (idx < metaParts.length - 1) innerY += 0.5;
        });
        y += metaH + 5;
    } else {
        y += 2;
    }

    if (opts.mergedSessionsNote) {
        const noteH = 16;
        setFill(doc, COL.amberTint);
        setDraw(doc, COL.amberBorder);
        doc.setLineWidth(0.3);
        doc.rect(margin, y, pageW - margin * 2, noteH, "FD");
        printer.setFontSize(9);
        setText(doc, COL.brandDark);
        y = printer.print(`<b>تنويه:</b> ${escapeRich(opts.mergedSessionsNote)}`, {
            startY: y + 4,
        });
        setText(doc, COL.slate);
        y += noteH + 4;
    }

    /* ========== الملخص التنفيذي ========== */
    const sorted = [...(opts.results || [])].sort(
        (a, b) => (b.score || 0) - (a.score || 0)
    );
    const sum = computeExecutiveSummary(sorted);

    setDraw(doc, COL.brand);
    doc.setLineWidth(0.55);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
    setText(doc, COL.brandDark);
    printer.setFontSize(11.5);
    y = printer.print("<b>١ — الملخص التنفيذي</b>", { startY: y });
    setText(doc, COL.slate);
    y += 2;

    const summaryH = 28;
    setFill(doc, COL.summaryBg);
    setDraw(doc, COL.brandBorder);
    doc.setLineWidth(0.28);
    doc.rect(margin, y, pageW - margin * 2, summaryH, "FD");

    printer.setFontSize(9.2);
    let sy = y + 4;
    if (sum.n === 0) {
        sy = printer.print("لا توجد بيانات كمية كافية لاشتقاق المؤشرات (لا توجد محاولات مسجّلة).", {
            startY: sy,
        });
    } else {
        sy = printer.print(
            `<b>إجمالي المحاولات المسجّلة:</b> <ltr>${sum.n}</ltr> — <b>متوسط النسبة:</b> <ltr>${sum.avgPct}%</ltr> — <b>متوسط النقاط:</b> <ltr>${sum.avgScore}</ltr> — <b>أعلى نقاط:</b> <ltr>${sum.maxScore}</ltr>`,
            { startY: sy }
        );
        sy += 1;
        sy = printer.print(
            `<b>توزيع المشاركين:</b> أعضاء مسجّلون <ltr>${sum.members}</ltr> — زوار <ltr>${sum.guests}</ltr>`,
            { startY: sy }
        );
    }
    y += summaryH + 6;

    /* ========== جدول المشاركين ========== */
    setDraw(doc, COL.brand);
    doc.setLineWidth(0.55);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
    setText(doc, COL.brandDark);
    printer.setFontSize(11.5);
    y = printer.print("<b>٢ — سجل المشاركين والنتائج</b>", { startY: y });
    setText(doc, COL.muted);
    printer.setFontSize(8.5);
    y += 2;
    y = printer.print(
        "كل سجل يتضمّن: الترتيب، الاسم، النسبة المئوية، النقاط، الإجابات الصحيحة والخاطئة، زمن الإنجاز (ثانية)، ونوع المشاركة.",
        { startY: y }
    );
    setText(doc, COL.slate);
    y += 4;

    /* صف عناوين الجدول */
    const theadH = 9;
    setFill(doc, COL.tableHead);
    setDraw(doc, COL.border);
    doc.setLineWidth(0.22);
    doc.rect(margin, y, pageW - margin * 2, theadH, "FD");
    printer.setFontSize(8.3);
    setText(doc, COL.brandDark);
    y = printer.print(
        "<b>الترتيب</b> · <b>المشارك</b> · <b>النسبة</b> · <b>النقاط</b> · <b>ص/خطأ</b> · <b>الوقت</b> · <b>النوع</b>",
        { startY: y + 2.5 }
    );
    setText(doc, COL.slate);
    y += theadH + 1;

    printer.setFontSize(9.5);

    if (sorted.length === 0) {
        setFill(doc, COL.rowAlt);
        setDraw(doc, COL.border);
        doc.setLineWidth(0.2);
        doc.rect(margin, y, pageW - margin * 2, 18, "FD");
        y += 5;
        y = printer.print("لا توجد سجلات مشاركين ضمن نطاق هذا التقرير.", { startY: y });
        y += 14;
    } else {
        sorted.forEach((r, i) => {
            if (i > 0) {
                setDraw(doc, COL.border);
                doc.setLineWidth(0.1);
                doc.line(margin + 2, y, pageW - margin - 2, y);
                y += 1.8;
            }

            setFill(doc, i % 2 === 0 ? COL.rowAlt : COL.white);
            doc.rect(margin, y, pageW - margin * 2, 15.5, "F");

            const name = escapeRich(
                String(
                    r.user?.name ||
                        r.name ||
                        r.participant_display_name ||
                        "—"
                )
            );
            const pct =
                r.percentage != null ? String(Math.round(Number(r.percentage))) : "—";
            const score = r.score != null ? String(r.score) : "—";
            const ca = r.correct_answers != null ? String(r.correct_answers) : "—";
            const wa = r.wrong_answers != null ? String(r.wrong_answers) : "—";
            const tt = r.time_taken != null ? String(r.time_taken) : "—";
            const type = r.user?.id ? "مسجّل" : "زائر";

            y += 2.2;
            y = printer.print(`<b>${i + 1}.</b> ${name}`, { startY: y });
            printer.setFontSize(8.6);
            setText(doc, COL.muted);
            y = printer.print(
                `النسبة <ltr>${pct}%</ltr> · النقاط <ltr>${score}</ltr> · صحيح <ltr>${ca}</ltr> · خطأ <ltr>${wa}</ltr> · وقت <ltr>${tt}</ltr> ث · ${type}`,
                { startY: y + 0.4 }
            );
            setText(doc, COL.slate);
            printer.setFontSize(9.5);
            y += 2;
        });
    }

    /* ========== تحليل الأسئلة ========== */
    if (opts.questionRows && opts.questionRows.length > 0) {
        y += 3;
        setDraw(doc, COL.brand);
        doc.setLineWidth(0.55);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
        setText(doc, COL.brandDark);
        printer.setFontSize(11.5);
        y = printer.print("<b>٣ — تحليل الأسئلة</b>", { startY: y });
        setText(doc, COL.slate);
        y += 3;

        printer.setFontSize(9.5);
        opts.questionRows.forEach((q, idx) => {
            if (idx > 0) {
                y += 2;
                setDraw(doc, COL.border);
                doc.setLineWidth(0.15);
                doc.line(margin + 2, y, pageW - margin - 2, y);
                y += 3;
            }

            const qt = escapeRich(stripHtml(q.questionText).slice(0, 550));
            const boxTop = y;
            const qBoxH = 38;

            setFill(doc, COL.questionBg);
            setDraw(doc, COL.brandBorder);
            doc.setLineWidth(0.28);
            doc.rect(margin, boxTop, pageW - margin * 2, qBoxH, "FD");
            setFill(doc, COL.brand);
            doc.rect(pageW - margin - 3.2, boxTop + 1.5, 3.2, qBoxH - 3, "F");

            y = boxTop + 3;
            printer.setFontSize(9);
            y = printer.print(`<b>سؤال ${idx + 1}.</b> ${qt}`, { startY: y });
            printer.setFontSize(8.8);
            setText(doc, COL.brandDark);
            y = printer.print(
                `<b>الدقة:</b> <ltr>${q.accuracy}%</ltr> — <b>إجابات صحيحة:</b> <ltr>${q.correct}</ltr> — <b>إجمالي الإجابات المقيّمة:</b> <ltr>${q.total}</ltr>`,
                { startY: y + 0.6 }
            );
            setText(doc, COL.slate);
            printer.setFontSize(9.5);
            y = Math.max(y, boxTop + qBoxH) + 2;
        });
    }

    /* ========== خاتمة ========== */
    y += 4;
    setDraw(doc, COL.border);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
    setText(doc, COL.muted);
    printer.setFontSize(8);
    const generated = new Date().toLocaleString("ar-SA", {
        dateStyle: "full",
        timeStyle: "short",
    });
    y = printer.print(
        escapeRich(
            `أُعدّ هذا التقرير آلياً في ${generated} — المرجع ${ref} — منصة التحديات التعليمية — هذه الوثيقة لا تحل محل السجلات الرسمية المعتمدة من الجهة التعليمية عند اشتراط ذلك.`
        ),
        { startY: y }
    );

    /* اسم ملف ASCII لتوافق أنظمة الملفات */
    doc.save(`challenge-report-${ref}.pdf`);
}

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
    WAHJ_ATTENDANCE_OPTIONS,
    formatWahjAttendance,
    type WahjAttendanceLevel,
} from "@/lib/wahjIntakeLabels";
import {
    lookupWahjParticipant,
    type WahjIntakeFormValues,
    type WahjParticipantLookup,
} from "@/lib/wahjParticipantLinks";

type WahjIntakeFormProps = {
    subjectId: string;
    values: WahjIntakeFormValues;
    onChange: (values: WahjIntakeFormValues) => void;
    participantId?: string;
    referenceId?: string;
    onParticipantResolved: (payload: {
        participantId: string;
        referenceId: string;
        displayName: string;
        lookup?: WahjParticipantLookup;
    }) => void;
    onClearParticipant: () => void;
};

function AttendanceField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: WahjAttendanceLevel;
    onChange: (value: WahjAttendanceLevel) => void;
}) {
    return (
        <div className="space-y-2 text-right">
            <Label className="text-sm font-semibold">{label}</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {WAHJ_ATTENDANCE_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            value === option.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:border-primary/40"
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function WahjIntakeForm({
    subjectId,
    values,
    onChange,
    participantId,
    referenceId,
    onParticipantResolved,
    onClearParticipant,
}: WahjIntakeFormProps) {
    const [hasParticipatedBefore, setHasParticipatedBefore] = useState<boolean | null>(null);
    const [referenceInput, setReferenceInput] = useState(referenceId || "");
    const [lookup, setLookup] = useState<WahjParticipantLookup | null>(null);
    const [lookupError, setLookupError] = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);

    const patch = (partial: Partial<WahjIntakeFormValues>) => {
        onChange({ ...values, ...partial });
    };

    const handleLookup = async () => {
        setLookupError("");
        setLookupLoading(true);
        try {
            const result = await lookupWahjParticipant(referenceInput, subjectId);
            if (!result) {
                setLookup(null);
                setLookupError("لم نجد رقماً مطابقاً. تأكد من الرقم أو سجّل كمشارك جديد.");
                return;
            }
            setLookup(result);
            patch({ displayName: result.displayName });
            onParticipantResolved({
                participantId: result.participantId,
                referenceId: result.referenceId,
                displayName: result.displayName,
                lookup: result,
            });
        } catch {
            setLookupError("تعذر التحقق من الرقم. حاول مرة أخرى.");
        } finally {
            setLookupLoading(false);
        }
    };

    const resetReturningFlow = () => {
        setHasParticipatedBefore(false);
        setReferenceInput("");
        setLookup(null);
        setLookupError("");
        onClearParticipant();
        patch({
            displayName: "",
            pagesRead: 0,
            benefitsCount: 0,
            discussionAttendance: "none",
            enrichmentAttendance: "none",
        });
    };

    return (
        <div className="space-y-5 text-right">
            <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm font-bold text-foreground">هل سبق أن شاركت في قراء وهج؟</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setHasParticipatedBefore(true);
                            setLookup(null);
                            setLookupError("");
                        }}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                            hasParticipatedBefore === true
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border"
                        }`}
                    >
                        نعم
                    </button>
                    <button
                        type="button"
                        onClick={resetReturningFlow}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                            hasParticipatedBefore === false
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border"
                        }`}
                    >
                        لا، أول مرة
                    </button>
                </div>
            </div>

            {hasParticipatedBefore === true && (
                <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                    <Label htmlFor="wahj-reference-id">رقم المشاركة السابق</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                            id="wahj-reference-id"
                            dir="ltr"
                            value={referenceInput}
                            onChange={(e) => setReferenceInput(e.target.value.toUpperCase())}
                            placeholder="WJ-ABC123"
                            className="text-left uppercase"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void handleLookup()}
                            disabled={lookupLoading || !referenceInput.trim()}
                        >
                            {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحقق"}
                        </Button>
                    </div>
                    {lookupError && <p className="text-xs font-medium text-destructive">{lookupError}</p>}
                    {lookup && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-6">
                            <p className="font-bold text-primary">ملخص مشاركتك السابقة</p>
                            <p>عدد المحاولات: {lookup.attemptCount}</p>
                            <p>إجمالي الصفحات: {lookup.totalPages}</p>
                            <p>إجمالي الفوائد: {lookup.totalBenefits}</p>
                            {lookup.lastAttempt && (
                                <p className="mt-1 text-muted-foreground">
                                    آخر محاولة: {lookup.lastAttempt.pagesRead} صفحة،{" "}
                                    {lookup.lastAttempt.benefitsCount} فائدة، الجلسات النقاشية{" "}
                                    {formatWahjAttendance(lookup.lastAttempt.discussionAttendance)}، اللقاءات
                                    الإثرائية {formatWahjAttendance(lookup.lastAttempt.enrichmentAttendance)}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="wahj-name">الاسم</Label>
                <Input
                    id="wahj-name"
                    dir="rtl"
                    value={values.displayName}
                    onChange={(e) => patch({ displayName: e.target.value })}
                    placeholder="اكتب اسمك"
                    className="text-right"
                    readOnly={Boolean(participantId && lookup)}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="wahj-pages">كم عدد الصفحات المقروءة؟</Label>
                    <Input
                        id="wahj-pages"
                        type="number"
                        min={0}
                        value={Number.isFinite(values.pagesRead) ? values.pagesRead : 0}
                        onChange={(e) => patch({ pagesRead: Math.max(0, Number(e.target.value) || 0) })}
                        className="text-right"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="wahj-benefits">كم عدد الفوائد المقيدة لديك؟</Label>
                    <Input
                        id="wahj-benefits"
                        type="number"
                        min={0}
                        value={Number.isFinite(values.benefitsCount) ? values.benefitsCount : 0}
                        onChange={(e) => patch({ benefitsCount: Math.max(0, Number(e.target.value) || 0) })}
                        className="text-right"
                    />
                </div>
            </div>

            <AttendanceField
                label="الجلسات النقاشية"
                value={values.discussionAttendance}
                onChange={(discussionAttendance) => patch({ discussionAttendance })}
            />

            <AttendanceField
                label="اللقاءات الإثرائية"
                value={values.enrichmentAttendance}
                onChange={(enrichmentAttendance) => patch({ enrichmentAttendance })}
            />
        </div>
    );
}

export function isWahjIntakeComplete(values: WahjIntakeFormValues): boolean {
    return Boolean(
        values.displayName.trim() &&
        values.pagesRead >= 0 &&
        values.benefitsCount >= 0 &&
        values.discussionAttendance &&
        values.enrichmentAttendance,
    );
}

export const defaultWahjIntakeValues = (): WahjIntakeFormValues => ({
    displayName: "",
    pagesRead: 0,
    benefitsCount: 0,
    discussionAttendance: "none",
    enrichmentAttendance: "none",
});

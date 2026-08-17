import { useMemo, useState } from "react";
import { CalendarIcon, Clock, RotateCcw, X } from "lucide-react";
import { ar, enUS } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import {
    parseDateTimeLocalValue,
    roundUpToMinuteStep,
    toDateTimeLocalValue,
} from "@/lib/dateTimeLocal";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

function startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

interface DateTimePickerProps {
    /** `datetime-local` string (`YYYY-MM-DDTHH:mm`), or "" when nothing is picked yet. */
    value: string;
    onChange: (value: string) => void;
    /** Minutes granularity of the minute list. */
    minuteStep?: number;
    /** Earliest selectable moment — days before it are disabled. */
    minDate?: Date | null;
    /** Time used when a day is picked before any time was chosen. */
    defaultHour?: number;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export function DateTimePicker({
    value,
    onChange,
    minuteStep = 5,
    minDate = null,
    defaultHour = 8,
    placeholder,
    disabled,
    className,
    id,
}: DateTimePickerProps) {
    const { t, locale, dir, isRtl } = useDashboardLocale();
    const [open, setOpen] = useState(false);

    const selected = parseDateTimeLocalValue(value);
    const dateFnsLocale = isRtl ? ar : enUS;

    const hours12 = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
    const minutes = useMemo(
        () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
        [minuteStep],
    );

    const hour24 = selected?.getHours() ?? defaultHour;
    const isPm = hour24 >= 12;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const minute = selected?.getMinutes() ?? 0;

    const dateLabel = selected
        ? selected.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : "";
    const timeLabel = selected
        ? selected.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
        : "";

    /** Writes a new value, filling in the default time when only a day was picked. */
    const commit = (next: Date) => {
        onChange(toDateTimeLocalValue(next));
    };

    const handleSelectDay = (day: Date | undefined) => {
        if (!day) return;
        const next = new Date(day);
        next.setHours(selected ? selected.getHours() : defaultHour, selected ? selected.getMinutes() : 0, 0, 0);
        commit(next);
    };

    const applyTime = (nextHour24: number, nextMinute: number) => {
        const base = selected ? new Date(selected) : roundUpToMinuteStep(new Date(), minuteStep);
        base.setHours(nextHour24, nextMinute, 0, 0);
        commit(base);
    };

    const handleHourChange = (nextHour12: number) => {
        const normalized = nextHour12 % 12;
        applyTime(isPm ? normalized + 12 : normalized, minute);
    };

    const handlePeriodChange = (pm: boolean) => {
        const normalized = hour12 % 12;
        applyTime(pm ? normalized + 12 : normalized, minute);
    };

    const handleNow = () => {
        commit(roundUpToMinuteStep(new Date(), minuteStep));
    };

    const handleClear = () => {
        onChange("");
        setOpen(false);
    };

    const disabledDays = minDate ? { before: startOfDay(minDate) } : undefined;
    const selectClassName =
        "h-10 rounded-md border border-input bg-background px-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "h-12 w-full justify-start gap-2 px-3 font-normal",
                        !selected && "text-muted-foreground",
                        className,
                    )}
                >
                    <CalendarIcon className="w-4 h-4 shrink-0 text-primary" />
                    {selected ? (
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0 text-start">
                            <span className="font-semibold">{dateLabel}</span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" />
                                {timeLabel}
                            </span>
                        </span>
                    ) : (
                        <span>{placeholder ?? t("dash.common.dateTimePicker.placeholder")}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" dir={dir} className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selected ?? undefined}
                    defaultMonth={selected ?? minDate ?? undefined}
                    onSelect={handleSelectDay}
                    disabled={disabledDays}
                    locale={dateFnsLocale}
                    dir={dir}
                    initialFocus
                />

                <div className="border-t p-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <Clock className="w-4 h-4 text-primary" />
                        {t("dash.common.dateTimePicker.timeLabel")}
                    </div>

                    <div className="flex items-center gap-2" dir="ltr">
                        <select
                            aria-label={t("dash.common.dateTimePicker.hour")}
                            className={selectClassName}
                            value={hour12}
                            onChange={(e) => handleHourChange(Number(e.target.value))}
                        >
                            {hours12.map((h) => (
                                <option key={h} value={h}>{pad(h)}</option>
                            ))}
                        </select>
                        <span className="font-bold">:</span>
                        <select
                            aria-label={t("dash.common.dateTimePicker.minute")}
                            className={selectClassName}
                            value={minutes.includes(minute) ? minute : minutes[0]}
                            onChange={(e) => applyTime(hour24, Number(e.target.value))}
                        >
                            {minutes.map((m) => (
                                <option key={m} value={m}>{pad(m)}</option>
                            ))}
                            {!minutes.includes(minute) && <option value={minute}>{pad(minute)}</option>}
                        </select>

                        <div className="ms-1 flex rounded-md border border-input p-0.5">
                            <button
                                type="button"
                                onClick={() => handlePeriodChange(false)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded",
                                    !isPm ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                                )}
                            >
                                {t("dash.common.dateTimePicker.am")}
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePeriodChange(true)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded",
                                    isPm ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                                )}
                            >
                                {t("dash.common.dateTimePicker.pm")}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={handleNow}>
                                <RotateCcw className="w-3.5 h-3.5" />
                                {t("dash.common.dateTimePicker.now")}
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={handleClear}>
                                <X className="w-3.5 h-3.5" />
                                {t("dash.common.dateTimePicker.clear")}
                            </Button>
                        </div>
                        <Button type="button" size="sm" onClick={() => setOpen(false)}>
                            {t("dash.common.dateTimePicker.done")}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default DateTimePicker;

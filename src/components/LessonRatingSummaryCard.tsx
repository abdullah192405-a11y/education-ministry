import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TopicLessonRatingSummary } from "@/lib/topicRatingStats";

type LessonRatingSummaryCardProps = {
    summary: TopicLessonRatingSummary;
    emptyMessage?: string;
    className?: string;
};

const LessonRatingSummaryCard = ({
    summary,
    emptyMessage = "لا توجد تقييمات بعد — يظهر تقييم الطلاب والزوار بعد إكمال التحدي.",
    className,
}: LessonRatingSummaryCardProps) => (
    <Card className={className ?? "border-amber-200/60 bg-gradient-to-br from-amber-50/30 via-background to-background"}>
        <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm">تقييم الدرس</CardTitle>
                {summary.total > 0 && (
                    <Badge variant="secondary" className="font-bold">
                        {summary.total} تقييم
                    </Badge>
                )}
            </div>
        </CardHeader>
        <CardContent>
            {summary.total === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
                <>
                    <p className="mb-4 text-center text-sm text-muted-foreground">
                        المتوسط{" "}
                        <span className="text-xl font-black text-foreground tabular-nums">
                            {summary.average.toFixed(1)}
                        </span>{" "}
                        / 5
                    </p>
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                        {summary.distribution.map((row) => (
                            <div
                                key={row.value}
                                className="flex flex-col items-center rounded-xl border bg-background/80 p-2 sm:p-3"
                            >
                                <span className="text-2xl sm:text-3xl leading-none" aria-hidden>
                                    {row.emoji}
                                </span>
                                <span className="mt-1 text-sm font-black tabular-nums">{row.count}</span>
                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-primary transition-all"
                                        style={{ width: `${row.percent}%` }}
                                    />
                                </div>
                                <span className="mt-1 hidden text-center text-[10px] leading-tight text-muted-foreground sm:block">
                                    {row.label}
                                </span>
                                <span className="sr-only sm:hidden">{row.label}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </CardContent>
    </Card>
);

export default LessonRatingSummaryCard;

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTopicRatings, useUpsertTopicRating } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { findMyTopicRating, getOrCreateTopicRatingGuestId } from "@/lib/topicRatingGuest";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const LESSON_RATING_OPTIONS = [
    { value: 1, emoji: "\u{1F620}", label: "سيء جداً" },
    { value: 2, emoji: "\u{1F61E}", label: "غير راضٍ" },
    { value: 3, emoji: "\u{1F610}", label: "محايد" },
    { value: 4, emoji: "\u{1F604}", label: "جيد" },
    { value: 5, emoji: "\u{1F929}", label: "ممتاز" },
] as const;

type LessonEmojiRatingContentProps = {
    topicId: string;
    userId?: string | null;
    compact?: boolean;
    className?: string;
    onRated?: () => void;
};

export const LessonEmojiRatingContent = ({
    topicId,
    userId,
    className,
    compact = false,
    onRated,
}: LessonEmojiRatingContentProps) => {
    const { toast } = useToast();
    const { data: topicRatings = [] } = useTopicRatings(topicId);
    const upsertTopicRatingMutation = useUpsertTopicRating();
    const [guestId] = useState(() => getOrCreateTopicRatingGuestId());

    const ratingsList = Array.isArray(topicRatings) ? topicRatings : [];
    const myRating = findMyTopicRating(ratingsList, {
        userId: userId || null,
        guestId: userId ? null : guestId,
    });

    const ratingsTotal = ratingsList.length;
    const ratingsAvg = useMemo(() => {
        if (ratingsTotal === 0) return 0;
        return ratingsList.reduce((sum: number, r: { rating?: number }) => sum + Number(r.rating || 0), 0) / ratingsTotal;
    }, [ratingsList, ratingsTotal]);

    const handleRate = async (value: number) => {
        if (!topicId) return;

        try {
            await upsertTopicRatingMutation.mutateAsync({
                topicId,
                userId: userId || null,
                guestId: userId ? null : guestId,
                rating: value,
            });
            toast({ title: "شكراً!", description: "تم حفظ تقييمك للدرس." });
            onRated?.();
        } catch (e) {
            console.error(e);
            toast({ title: "خطأ", description: "تعذر حفظ التقييم", variant: "destructive" });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("text-center", className)}
            dir="rtl"
        >
            {!compact && ratingsTotal > 0 && (
                <p className="text-xs text-muted-foreground mb-4">
                    {ratingsTotal} تقييم — المتوسط {ratingsAvg.toFixed(1)} / 5
                </p>
            )}

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid w-full grid-cols-5 gap-1.5 sm:gap-3 max-w-lg mx-auto"
            >
                {LESSON_RATING_OPTIONS.map((option) => {
                    const selected = myRating === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            disabled={upsertTopicRatingMutation.isPending}
                            onClick={() => void handleRate(option.value)}
                            aria-label={`${option.label} — ${option.value} من 5`}
                            aria-pressed={selected}
                            className={cn(
                                "flex min-h-[52px] sm:min-h-[72px] flex-col items-center justify-center gap-0.5 sm:gap-1",
                                "rounded-xl sm:rounded-2xl p-1.5 sm:p-3 transition-all touch-manipulation",
                                "hover:bg-muted/80 sm:hover:scale-110 active:scale-95",
                                "disabled:opacity-60 disabled:pointer-events-none",
                                selected && "bg-muted shadow-md ring-2 ring-primary/40 scale-[1.03] sm:scale-110"
                            )}
                        >
                            <span
                                className={cn(
                                    "text-[1.75rem] leading-none select-none sm:text-4xl md:text-5xl",
                                    selected ? "drop-shadow-md" : "opacity-80 hover:opacity-100"
                                )}
                            >
                                {option.emoji}
                            </span>
                            <span className="hidden sm:block text-[10px] md:text-xs text-muted-foreground font-medium leading-tight text-center px-0.5">
                                {option.label}
                            </span>
                            <span className="sr-only sm:hidden">{option.label}</span>
                        </button>
                    );
                })}
            </motion.div>

            {myRating > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                    تقييمك: {LESSON_RATING_OPTIONS.find((o) => o.value === myRating)?.emoji}
                </p>
            )}
        </motion.div>
    );
};

type LessonEmojiRatingProps = LessonEmojiRatingContentProps;

/** Inline card (e.g. topic page). */
const LessonEmojiRating = ({ className, ...props }: LessonEmojiRatingProps) => (
    <motion.div
        className={cn(
            "rounded-2xl border border-primary/15 bg-muted/30 px-4 py-5",
            className
        )}
    >
        <h3 className="text-base font-bold mb-1 text-center">تقييم الدرس</h3>
        {props.compact && (
            <p className="text-xs text-muted-foreground mb-4 text-center">كيف كانت تجربة هذا الدرس؟</p>
        )}
        <LessonEmojiRatingContent {...props} compact={props.compact ?? false} />
    </motion.div>
);

type LessonEmojiRatingDialogProps = {
    topicId: string;
    userId?: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/** Popup after challenge results. */
export const LessonEmojiRatingDialog = ({
    topicId,
    userId,
    open,
    onOpenChange,
}: LessonEmojiRatingDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
            dir="rtl"
            className={cn(
                "gap-3 border-0 p-4 shadow-2xl sm:gap-4 sm:border sm:p-6 sm:max-w-md sm:rounded-2xl",
                // Mobile: bottom sheet
                "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto",
                "max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0",
                "max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[min(88dvh,32rem)]",
                "max-sm:w-full max-sm:overflow-y-auto",
                "max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
                "max-sm:pt-5 max-sm:px-4",
                // Desktop: centered card (inherits default dialog centering)
                "sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]"
            )}
        >
            <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-muted sm:hidden" aria-hidden />

            <DialogHeader className="space-y-1 text-center sm:text-center">
                <DialogTitle className="text-lg font-black sm:text-xl">تقييم الدرس</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed sm:text-base">
                    كيف كانت تجربة هذا الدرس؟ اختر إيموجي يعبر عن رأيك
                </DialogDescription>
            </DialogHeader>

            <LessonEmojiRatingContent
                topicId={topicId}
                userId={userId}
                compact
                className="px-0 sm:px-2"
                onRated={() => onOpenChange(false)}
            />

            <Button
                type="button"
                variant="ghost"
                className="mt-1 h-11 w-full text-muted-foreground sm:mt-2 sm:h-12"
                onClick={() => onOpenChange(false)}
            >
                لاحقاً
            </Button>
        </DialogContent>
    </Dialog>
);

export default LessonEmojiRating;

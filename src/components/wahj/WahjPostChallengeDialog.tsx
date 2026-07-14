import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LessonEmojiRatingContent } from "@/components/LessonEmojiRating";
import { useToast } from "@/hooks/use-toast";

type WahjPostChallengeDialogProps = {
    open: boolean;
    referenceId?: string;
    showReferenceStep: boolean;
    topicId: string;
    userId?: string | null;
    onComplete: () => void;
};

export function WahjPostChallengeDialog({
    open,
    referenceId,
    showReferenceStep,
    topicId,
    userId,
    onComplete,
}: WahjPostChallengeDialogProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<"reference" | "rating">("reference");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!open) return;
        setStep(showReferenceStep && referenceId ? "reference" : "rating");
        setCopied(false);
    }, [open, showReferenceStep, referenceId]);

    const handleCopyReference = async () => {
        if (!referenceId) return;
        try {
            await navigator.clipboard.writeText(referenceId);
            setCopied(true);
            toast({ title: "تم نسخ الرقم", description: referenceId });
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            toast({
                variant: "destructive",
                title: "تعذّر النسخ",
                description: referenceId,
            });
        }
    };

    const goToRating = () => setStep("rating");

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen && step === "rating") onComplete();
            }}
        >
            <DialogContent
                dir="rtl"
                className={cn(
                    "gap-4 border-0 p-4 shadow-2xl sm:gap-5 sm:border sm:p-6 sm:max-w-md sm:rounded-2xl",
                    "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto",
                    "max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0",
                    "max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[min(88dvh,36rem)]",
                    "max-sm:w-full max-sm:overflow-y-auto",
                    "max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
                    "sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
                )}
                onPointerDownOutside={(event) => event.preventDefault()}
                onEscapeKeyDown={(event) => event.preventDefault()}
            >
                <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-muted sm:hidden" aria-hidden />

                {step === "reference" && referenceId ? (
                    <>
                        <DialogHeader className="space-y-2 text-center sm:text-center">
                            <DialogTitle className="text-lg font-black sm:text-xl">
                                رقم مشاركتك في قراء وهج
                            </DialogTitle>
                            <DialogDescription className="text-sm leading-relaxed">
                                احفظ هذا الرقم — صوّر الشاشة أو انسخه للمشاركة القادمة حتى تُربط محاولاتك معاً.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-center">
                            <p
                                dir="ltr"
                                className="text-2xl font-black tracking-wide text-primary sm:text-3xl"
                            >
                                {referenceId}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-11 gap-2"
                                onClick={() => void handleCopyReference()}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? "تم النسخ" : "انسخ الرقم"}
                            </Button>
                            <Button type="button" className="h-11" onClick={goToRating}>
                                التالي
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <DialogHeader className="space-y-1 text-center sm:text-center">
                            <DialogTitle className="text-lg font-black sm:text-xl">
                                كيف كانت تجربتك؟
                            </DialogTitle>
                            <DialogDescription className="text-sm leading-relaxed">
                                قبل عرض تقريرك، شاركنا شعورك تجاه هذا الدرس.
                            </DialogDescription>
                        </DialogHeader>

                        <LessonEmojiRatingContent
                            topicId={topicId}
                            userId={userId}
                            compact
                            className="px-0 sm:px-2"
                            onRated={onComplete}
                        />

                        <Button
                            type="button"
                            variant="ghost"
                            className="mt-1 h-11 w-full text-muted-foreground"
                            onClick={onComplete}
                        >
                            لاحقاً — عرض التقرير
                        </Button>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

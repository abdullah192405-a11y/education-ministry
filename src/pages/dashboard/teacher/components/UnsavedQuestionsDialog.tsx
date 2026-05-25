import { Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface UnsavedQuestionsDialogProps {
    open: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onStay: () => void;
}

const UnsavedQuestionsDialog = ({
    open,
    onSave,
    onDiscard,
    onStay,
}: UnsavedQuestionsDialogProps) => {
    const { t, dir, isRtl } = useDashboardLocale();

    return (
        <AlertDialog open={open} onOpenChange={(next) => !next && onStay()}>
            <AlertDialogContent dir={dir} className="sm:max-w-lg gap-0 p-0 overflow-hidden">
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4 flex items-start gap-4">
                    <div
                        className="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0"
                        aria-hidden
                    >
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <AlertDialogHeader className={cn("flex-1 space-y-1 text-start", isRtl ? "items-start" : "items-start")}>
                        <AlertDialogTitle className="text-base sm:text-lg leading-snug">
                            {t("dash.teacher.topics.qe.unsavedDialogTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t("dash.teacher.topics.qe.unsavedDialogDesc")}
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </div>

                <div className="px-6 py-4">
                    <p className="text-xs text-muted-foreground rounded-lg border border-dashed bg-muted/40 px-3 py-2.5 leading-relaxed">
                        {t("dash.teacher.topics.qe.unsavedDialogHint")}
                    </p>
                </div>

                <AlertDialogFooter
                    className={cn(
                        "flex-col gap-2 px-6 pb-6 pt-0 sm:flex-col sm:space-x-0",
                        isRtl ? "sm:items-stretch" : "sm:items-stretch"
                    )}
                >
                    <AlertDialogAction
                        onClick={onSave}
                        className="w-full h-11 gap-2 text-base font-semibold"
                    >
                        <Save className="w-4 h-4 shrink-0" />
                        {t("dash.teacher.topics.qe.unsavedSave")}
                    </AlertDialogAction>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onDiscard}
                        className="w-full h-11 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                        {t("dash.teacher.topics.qe.unsavedDiscard")}
                    </Button>
                    <AlertDialogCancel
                        onClick={onStay}
                        className="w-full h-10 mt-0 border-0 bg-transparent hover:bg-muted shadow-none"
                    >
                        {t("dash.teacher.topics.qe.unsavedStay")}
                    </AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default UnsavedQuestionsDialog;

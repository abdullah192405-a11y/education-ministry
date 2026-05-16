import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type OnboardingStepIndicatorProps = {
    steps: { id: number; label: string }[];
    current: number;
    className?: string;
};

export function OnboardingStepIndicator({ steps, current, className }: OnboardingStepIndicatorProps) {
    return (
        <div className={cn("w-full", className)} dir="rtl">
            <div className="flex items-center justify-between gap-1">
                {steps.map((s, i) => {
                    const done = current > s.id;
                    const active = current === s.id;
                    return (
                        <div key={s.id} className="flex flex-1 items-center min-w-0">
                            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                                <div
                                    className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-colors",
                                        done && "bg-primary border-primary text-primary-foreground",
                                        active &&
                                            !done &&
                                            "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                                        !done && !active && "bg-muted border-transparent text-muted-foreground",
                                    )}
                                >
                                    {done ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                                </div>
                                <span
                                    className={cn(
                                        "text-[11px] font-medium text-center leading-tight truncate w-full px-0.5",
                                        active ? "text-foreground" : "text-muted-foreground",
                                    )}
                                >
                                    {s.label}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <div
                                    className={cn(
                                        "h-0.5 flex-1 mx-1 mb-5 rounded-full transition-colors",
                                        current > s.id ? "bg-primary" : "bg-muted",
                                    )}
                                    aria-hidden
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

import type { ReactNode } from "react";

type SuperadminTabHeaderProps = {
    title: string;
    description?: string;
    action?: ReactNode;
};

export function SuperadminTabHeader({ title, description, action }: SuperadminTabHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-border/80">
            <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{description}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

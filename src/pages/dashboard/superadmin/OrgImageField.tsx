import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useDashboardLocale } from "@/contexts/LanguageContext";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

type OrgImageFieldProps = {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    className?: string;
    previewRounded?: "lg" | "full";
};

export function OrgImageField({
    value,
    onChange,
    label,
    className,
    previewRounded = "lg",
}: OrgImageFieldProps) {
    const { toast } = useToast();
    const { t } = useDashboardLocale();
    const { data: user } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fieldLabel = label ?? t("dash.super.orgImage.label");

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        if (!user?.id) {
            toast({ variant: "destructive", description: t("dash.super.orgImage.loginRequired") });
            return;
        }
        if (!file.type.startsWith("image/")) {
            toast({
                variant: "destructive",
                description: t("dash.super.orgImage.invalidType"),
            });
            return;
        }
        if (file.size > MAX_BYTES) {
            toast({ variant: "destructive", description: t("dash.super.orgImage.tooLarge") });
            return;
        }

        setIsUploading(true);
        try {
            const ext = file.name.split(".").pop() || "jpg";
            const fileName = `org-${crypto.randomUUID()}.${ext}`;
            const filePath = `${user.id}/organizations/${fileName}`;
            const { error } = await supabase.storage.from("teacher-content").upload(filePath, file);
            if (error) throw error;
            const { data } = supabase.storage.from("teacher-content").getPublicUrl(filePath);
            onChange(data.publicUrl);
            toast({ description: t("dash.super.orgImage.success") });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t("dash.super.orgImage.uploadError");
            toast({ variant: "destructive", description: msg });
        } finally {
            setIsUploading(false);
        }
    }

    const trimmed = value.trim();
    const previewRound = previewRounded === "full" ? "rounded-full" : "rounded-lg";

    return (
        <div className={cn("space-y-2", className)}>
            <Label>{fieldLabel}</Label>
            <p className="text-xs text-muted-foreground">
                {t("dash.super.orgImage.hint")}{" "}
                <span dir="ltr" className="font-mono">
                    https://
                </span>
            </p>
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                onChange={handleFileChange}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                    type="button"
                    variant="outline"
                    className="gap-2 shrink-0"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4" />
                    )}
                    {isUploading ? t("dash.super.orgImage.uploading") : t("dash.super.orgImage.upload")}
                </Button>
                <Input
                    dir="ltr"
                    className="text-left font-mono text-sm flex-1"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="https://..."
                />
                {trimmed ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        title={t("dash.super.orgImage.remove")}
                        onClick={() => onChange("")}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                ) : null}
            </div>
            {trimmed ? (
                <div
                    className={cn(
                        "relative mt-1 overflow-hidden border bg-muted/30 max-w-xs",
                        previewRound,
                    )}
                >
                    <img
                        src={trimmed}
                        alt=""
                        className={cn(
                            "w-full object-cover",
                            previewRounded === "full" ? "h-24 w-24" : "h-32",
                        )}
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    MessageCircle,
    Copy,
    Eye,
    EyeOff,
    Link2,
    Mail,
    KeyRound,
    User,
    Building2,
} from "lucide-react";
import { copyToClipboard, getAppLoginUrl, openWhatsAppShare } from "@/lib/accountOnboarding";
import type { useToast } from "@/hooks/use-toast";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export type DeliveryCredentials = {
    adminName: string;
    email: string;
    password: string;
    orgName: string;
    packageLabel: string;
    phone: string | null;
};

type CredentialsDeliveryPanelProps = {
    creds: DeliveryCredentials;
    message: string;
    onReset: () => void;
    toast: ReturnType<typeof useToast>["toast"];
};

function CopyFieldButton({
    label,
    value,
    toast,
}: {
    label: string;
    value: string;
    toast: CredentialsDeliveryPanelProps["toast"];
}) {
    const { t } = useDashboardLocale();

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title={t("dash.super.credentials.copyLabel", { label })}
            onClick={async () => {
                const ok = await copyToClipboard(value);
                toast({
                    description: ok
                        ? t("dash.super.credentials.copied", { label })
                        : t("dash.super.credentials.copyFailed"),
                    variant: ok ? "default" : "destructive",
                });
            }}
        >
            <Copy className="h-3.5 w-3.5" />
        </Button>
    );
}

export function CredentialsDeliveryPanel({ creds, message, onReset, toast }: CredentialsDeliveryPanelProps) {
    const { t, dir, isRtl } = useDashboardLocale();
    const [showPassword, setShowPassword] = useState(false);
    const loginUrl = getAppLoginUrl();

    const rows = [
        { icon: Building2, label: t("dash.super.credentials.org"), value: creds.orgName },
        { icon: User, label: t("dash.super.credentials.manager"), value: creds.adminName },
        { icon: Mail, label: t("dash.super.credentials.email"), value: creds.email, mono: true },
        {
            icon: KeyRound,
            label: t("dash.super.credentials.password"),
            value: showPassword ? creds.password : "••••••••••",
            mono: true,
            hideCopy: !showPassword,
            extra: (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowPassword((v) => !v)}
                >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
            ),
            copyValue: creds.password,
        },
        {
            icon: Link2,
            label: t("dash.super.credentials.loginUrl"),
            value: loginUrl,
            mono: true,
            className: "sm:col-span-2",
        },
    ] as const;

    return (
        <div className="space-y-5 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                        <p className="font-semibold">{t("dash.super.credentials.successTitle")}</p>
                        <p className="text-xs text-muted-foreground font-normal mt-0.5">
                            {t("dash.super.credentials.successDesc")}
                        </p>
                    </div>
                </div>
                <Badge variant="secondary" className="w-fit">
                    {creds.packageLabel}
                </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
                {rows.map((row) => (
                    <div
                        key={row.label}
                        className={`flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-2.5 ${"className" in row ? row.className : ""}`}
                    >
                        <row.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className={cn("flex-1 min-w-0", isRtl ? "text-right" : "text-start")}>
                            <p className="text-[10px] text-muted-foreground">{row.label}</p>
                            <p
                                className={`text-sm font-medium truncate ${row.mono ? "font-mono text-left" : ""}`}
                                dir={row.mono ? "ltr" : dir}
                            >
                                {row.value}
                            </p>
                        </div>
                        {"extra" in row && row.extra}
                        {!("hideCopy" in row && row.hideCopy) && (
                            <CopyFieldButton
                                label={row.label}
                                value={"copyValue" in row && row.copyValue ? row.copyValue : row.value}
                                toast={toast}
                            />
                        )}
                    </div>
                ))}
            </div>

            <details className="rounded-lg border bg-background/60 group">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground list-none flex items-center justify-between">
                    {t("dash.super.credentials.messagePreview")}
                    <span className="text-[10px] group-open:hidden">{t("dash.super.credentials.show")}</span>
                </summary>
                <pre className="text-xs whitespace-pre-wrap px-3 pb-3 font-sans leading-relaxed border-t" dir={dir}>
                    {message}
                </pre>
            </details>

            <div className="flex flex-wrap gap-2 pt-1">
                <Button
                    type="button"
                    size="lg"
                    className="gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white flex-1 sm:flex-none min-w-[160px]"
                    onClick={() => openWhatsAppShare({ phone: creds.phone, message })}
                >
                    <MessageCircle className="w-4 h-4" />
                    {creds.phone ? t("dash.super.credentials.sendWhatsApp") : t("dash.super.credentials.openWhatsApp")}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={async () => {
                        const ok = await copyToClipboard(message);
                        toast({
                            description: ok
                                ? t("dash.super.credentials.messageCopied")
                                : t("dash.super.credentials.copyFailed"),
                            variant: ok ? "default" : "destructive",
                        });
                    }}
                >
                    <Copy className="w-4 h-4" />
                    {t("dash.super.credentials.copyMessage")}
                </Button>
                <Button type="button" variant="secondary" onClick={onReset}>
                    {t("dash.super.credentials.newAccount")}
                </Button>
            </div>

            {!creds.phone && (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-md px-3 py-2">
                    {t("dash.super.credentials.noPhoneHint")}
                </p>
            )}
        </div>
    );
}

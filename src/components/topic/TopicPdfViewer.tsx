import { Component, type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import {
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    FileText,
    Maximize2,
    Minimize2,
} from "lucide-react";

interface TopicPdfViewerProps {
    url: string;
    title?: string;
}

interface TopicPdfViewerState {
    hasError: boolean;
}

const buildPdfEmbedUrl = (url: string, page: number) => {
    const base = url.split("#")[0];
    return `${base}#page=${page}&view=FitH&toolbar=1`;
};

class TopicPdfViewerBoundary extends Component<
    TopicPdfViewerProps & { children: ReactNode },
    TopicPdfViewerState
> {
    state: TopicPdfViewerState = { hasError: false };

    static getDerivedStateFromError(): TopicPdfViewerState {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return <TopicPdfEmbedFallback url={this.props.url} title={this.props.title} />;
        }
        return this.props.children;
    }
}

const TopicPdfEmbedFallback = ({ url, title }: TopicPdfViewerProps) => {
    const { t } = useTranslation();

    return (
        <div className="flex h-[min(82vh,960px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-background shadow-lg sm:min-h-[520px]">
            <div className="flex items-center justify-end gap-2 border-b bg-background/95 px-3 py-2 sm:px-4">
                <Button size="sm" variant="secondary" className="h-9 text-xs font-semibold" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        {t("topicView.pdf.openNewWindow")}
                    </a>
                </Button>
            </div>
            <object
                data={buildPdfEmbedUrl(url, 1)}
                type="application/pdf"
                className="h-full w-full flex-1 bg-white"
                aria-label={title || t("topicView.pdf.viewPdf")}
            >
                <iframe
                    src={buildPdfEmbedUrl(url, 1)}
                    title={title || t("topicView.pdf.viewPdf")}
                    className="h-full w-full border-0 bg-white"
                />
            </object>
        </div>
    );
};

const TopicPdfViewerInner = ({ url, title }: TopicPdfViewerProps) => {
    const { t, dir } = useTranslation();
    const ChevronPrev = dir === "rtl" ? ChevronRight : ChevronLeft;
    const ChevronNext = dir === "rtl" ? ChevronLeft : ChevronRight;

    const [pageNum, setPageNum] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [useObjectTag, setUseObjectTag] = useState(false);

    const embedUrl = useMemo(() => buildPdfEmbedUrl(url, pageNum), [url, pageNum]);

    const toggleFullscreen = async () => {
        const shell = document.getElementById("topic-pdf-shell");
        if (!shell) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                setIsFullscreen(false);
            } else {
                await shell.requestFullscreen();
                setIsFullscreen(true);
            }
        } catch {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <div
            id="topic-pdf-shell"
            className={`flex flex-col overflow-hidden rounded-2xl border bg-muted/20 shadow-lg ${
                isFullscreen ? "h-screen w-screen rounded-none border-0" : "h-[min(82vh,960px)] min-h-[420px] sm:min-h-[520px]"
            }`}
        >
            <div className="flex flex-col gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                        disabled={pageNum <= 1}
                        onClick={() => setPageNum((page) => Math.max(1, page - 1))}
                        aria-label={t("topicView.previous")}
                    >
                        <ChevronPrev className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[6rem] text-center text-xs font-medium text-muted-foreground sm:text-sm">
                        {t("topicView.pdf.pageLabel", { page: pageNum })}
                    </span>
                    <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setPageNum((page) => page + 1)}
                        aria-label={t("topicView.next")}
                    >
                        <ChevronNext className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <p className="text-[11px] text-muted-foreground sm:text-xs">
                        {t("topicView.pdf.readabilityHint")}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="hidden h-9 w-9 sm:inline-flex"
                            onClick={() => void toggleFullscreen()}
                            aria-label={isFullscreen ? t("topicView.pdf.exitFullscreen") : t("topicView.pdf.fullscreen")}
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="secondary" className="h-9 px-2 text-xs font-semibold" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                <span className="hidden sm:inline">{t("topicView.pdf.openNewWindow")}</span>
                            </a>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="relative flex-1 bg-neutral-100 dark:bg-neutral-900">
                {useObjectTag ? (
                    <object
                        key={embedUrl}
                        data={embedUrl}
                        type="application/pdf"
                        className="absolute inset-0 h-full w-full bg-white"
                        aria-label={title || t("topicView.pdf.viewPdf")}
                    >
                        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">{t("topicView.pdf.embedBlocked")}</p>
                            <Button size="sm" asChild>
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                    {t("topicView.pdf.openNewWindow")}
                                </a>
                            </Button>
                        </div>
                    </object>
                ) : (
                    <iframe
                        key={embedUrl}
                        src={embedUrl}
                        title={title || t("topicView.pdf.viewPdf")}
                        className="absolute inset-0 h-full w-full border-0 bg-white"
                        onError={() => setUseObjectTag(true)}
                    />
                )}
            </div>
        </div>
    );
};

const TopicPdfViewer = (props: TopicPdfViewerProps) => (
    <TopicPdfViewerBoundary {...props}>
        <TopicPdfViewerInner {...props} />
    </TopicPdfViewerBoundary>
);

export default TopicPdfViewer;

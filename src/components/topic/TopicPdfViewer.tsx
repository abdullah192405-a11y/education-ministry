import { Component, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import {
    isPdfTooLargeForClientRender,
    loadTopicPdfDocument,
    renderTopicPdfPageImageUrl,
    resolveTopicPdfBlobUrl,
} from "@/lib/topicPdfPageRenderer";
import {
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    FileText,
    Maximize2,
    Minimize2,
} from "lucide-react";

interface TopicPdfViewerProps {
    url?: string | null;
    pdfBase64?: string | null;
    title?: string;
}

interface TopicPdfViewerState {
    hasError: boolean;
}

const isRenderingCancelled = (error: unknown) => {
    if (!(error instanceof Error)) return false;
    return error.name === "RenderingCancelledException" || /cancel/i.test(error.message);
};

const isMobileViewport = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

class TopicPdfViewerBoundary extends Component<
    TopicPdfViewerProps & { children: ReactNode },
    TopicPdfViewerState
> {
    state: TopicPdfViewerState = { hasError: false };

    static getDerivedStateFromError(): TopicPdfViewerState {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        console.error("Topic PDF viewer crashed:", error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <TopicPdfEmbedFallback
                    url={this.props.url}
                    pdfBase64={this.props.pdfBase64}
                    title={this.props.title}
                />
            );
        }
        return this.props.children;
    }
}

const TopicPdfEmbedFallback = ({ url, pdfBase64, title }: TopicPdfViewerProps) => {
    const { t } = useTranslation();
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | null = null;

        const prepare = async () => {
            try {
                if (url && !url.startsWith("data:")) {
                    if (!cancelled) setEmbedUrl(url);
                    return;
                }

                const resolved = await resolveTopicPdfBlobUrl(url, pdfBase64);
                objectUrl = resolved.startsWith("blob:") ? resolved : null;
                if (!cancelled) {
                    setEmbedUrl(resolved);
                }
            } catch (error) {
                console.error("Failed to prepare PDF embed:", error);
            }
        };

        void prepare();

        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [url, pdfBase64]);

    const openUrl = embedUrl || url || undefined;

    return (
        <div className="flex h-[min(82vh,960px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-background shadow-lg sm:min-h-[520px]">
            <div className="flex items-center justify-end gap-2 border-b bg-background/95 px-3 py-2 sm:px-4">
                {openUrl ? (
                    <Button size="sm" variant="secondary" className="h-9 text-xs font-semibold" asChild>
                        <a href={openUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            {t("topicView.pdf.openNewWindow")}
                        </a>
                    </Button>
                ) : null}
            </div>
            {embedUrl ? (
                <iframe
                    src={embedUrl}
                    title={title || t("topicView.pdf.viewPdf")}
                    className="h-full w-full flex-1 border-0 bg-white"
                />
            ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    {t("topicView.pdf.loading")}
                </div>
            )}
        </div>
    );
};

const TopicPdfViewerInner = ({ url, pdfBase64, title }: TopicPdfViewerProps) => {
    const { t, dir } = useTranslation();
    const ChevronPrev = dir === "rtl" ? ChevronRight : ChevronLeft;
    const ChevronNext = dir === "rtl" ? ChevronLeft : ChevronRight;

    const shellRef = useRef<HTMLDivElement>(null);
    const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const pageImageUrlRef = useRef<string | null>(null);
    const renderGenerationRef = useRef(0);

    const [pageNum, setPageNum] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
    const [openUrl, setOpenUrl] = useState<string | null>(null);
    const [loadingDoc, setLoadingDoc] = useState(true);
    const [renderingPage, setRenderingPage] = useState(false);
    const [useEmbedFallback, setUseEmbedFallback] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const revokePageImage = useCallback(() => {
        if (pageImageUrlRef.current) {
            URL.revokeObjectURL(pageImageUrlRef.current);
            pageImageUrlRef.current = null;
        }
    }, []);

    const destroyPdfDoc = useCallback(() => {
        revokePageImage();

        const doc = pdfDocRef.current;
        pdfDocRef.current = null;
        if (doc) {
            try {
                doc.destroy();
            } catch {
                // Ignore teardown errors during rapid media switches.
            }
        }

        if (blobUrlRef.current?.startsWith("blob:")) {
            URL.revokeObjectURL(blobUrlRef.current);
        }
        blobUrlRef.current = null;
    }, [revokePageImage]);

    useEffect(() => {
        let cancelled = false;

        const initialize = async () => {
            setLoadingDoc(true);
            setUseEmbedFallback(false);
            setPageNum(1);
            setTotalPages(0);
            setPageImageUrl(null);
            destroyPdfDoc();

            if (isPdfTooLargeForClientRender(pdfBase64)) {
                setUseEmbedFallback(true);
                setLoadingDoc(false);
                return;
            }

            try {
                const blobUrl = await resolveTopicPdfBlobUrl(url, pdfBase64);
                if (cancelled) {
                    if (blobUrl.startsWith("blob:")) URL.revokeObjectURL(blobUrl);
                    return;
                }

                blobUrlRef.current = blobUrl;
                setOpenUrl(blobUrl);

                const pdf = await loadTopicPdfDocument(blobUrl);
                if (cancelled) {
                    try {
                        pdf.destroy();
                    } catch {
                        // Ignore teardown errors when the viewer unmounts mid-load.
                    }
                    return;
                }

                pdfDocRef.current = pdf;
                setTotalPages(pdf.numPages);
            } catch (loadError) {
                console.error("Failed to load PDF:", loadError);
                if (!cancelled) {
                    setUseEmbedFallback(true);
                }
            } finally {
                if (!cancelled) {
                    setLoadingDoc(false);
                }
            }
        };

        void initialize();

        return () => {
            cancelled = true;
            destroyPdfDoc();
        };
    }, [url, pdfBase64, destroyPdfDoc]);

    useEffect(() => {
        const pdfDoc = pdfDocRef.current;
        if (!pdfDoc || useEmbedFallback || totalPages <= 0) {
            return;
        }

        const generation = ++renderGenerationRef.current;
        let cancelled = false;

        const renderPage = async () => {
            setRenderingPage(true);
            revokePageImage();

            try {
                const maxWidth = isMobileViewport() ? 720 : 1200;
                const nextImageUrl = await renderTopicPdfPageImageUrl(pdfDoc, pageNum, maxWidth);

                if (cancelled || generation !== renderGenerationRef.current) {
                    URL.revokeObjectURL(nextImageUrl);
                    return;
                }

                pageImageUrlRef.current = nextImageUrl;
                setPageImageUrl(nextImageUrl);
            } catch (renderError) {
                if (isRenderingCancelled(renderError) || cancelled || generation !== renderGenerationRef.current) {
                    return;
                }
                console.error("Failed to render PDF page:", renderError);
                setUseEmbedFallback(true);
            } finally {
                if (!cancelled && generation === renderGenerationRef.current) {
                    setRenderingPage(false);
                }
            }
        };

        void renderPage();

        return () => {
            cancelled = true;
        };
    }, [pageNum, totalPages, useEmbedFallback, revokePageImage]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        const shell = shellRef.current;
        if (!shell) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await shell.requestFullscreen();
            }
        } catch {
            if (openUrl) {
                window.open(openUrl, "_blank", "noopener,noreferrer");
            }
        }
    };

    if (useEmbedFallback) {
        return <TopicPdfEmbedFallback url={url} pdfBase64={pdfBase64} title={title} />;
    }

    const isBusy = loadingDoc || renderingPage;
    const pageLabel =
        totalPages > 0
            ? t("topicView.pdf.pageOf", { current: pageNum, total: totalPages })
            : t("topicView.pdf.pageLabel", { page: pageNum });

    return (
        <div
            ref={shellRef}
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
                        disabled={pageNum <= 1 || isBusy}
                        onClick={() => setPageNum((page) => Math.max(1, page - 1))}
                        aria-label={t("topicView.previous")}
                    >
                        <ChevronPrev className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[6.5rem] text-center text-xs font-medium text-muted-foreground sm:text-sm">
                        {pageLabel}
                    </span>
                    <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                        disabled={isBusy || (totalPages > 0 && pageNum >= totalPages)}
                        onClick={() => setPageNum((page) => (totalPages > 0 ? Math.min(totalPages, page + 1) : page + 1))}
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
                        {openUrl ? (
                            <Button size="sm" variant="secondary" className="h-9 px-2 text-xs font-semibold" asChild>
                                <a href={openUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t("topicView.pdf.openNewWindow")}</span>
                                </a>
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="relative flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-900">
                {isBusy && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 backdrop-blur-[1px]">
                        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                        <p className="text-sm font-medium text-muted-foreground">{t("topicView.pdf.loading")}</p>
                    </div>
                )}

                <div className="flex min-h-full justify-center p-3 sm:p-5">
                    {pageImageUrl ? (
                        <img
                            src={pageImageUrl}
                            alt={title || t("topicView.pdf.viewPdf")}
                            className="block max-w-full rounded-lg bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)] ring-1 ring-black/5"
                        />
                    ) : (
                        <div className="flex min-h-[240px] items-center justify-center rounded-lg bg-white/80 px-6">
                            <FileText className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                    )}
                </div>
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

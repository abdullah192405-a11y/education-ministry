import { Component, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { loadPdfDocumentFromUrl } from "@/lib/pdfExtractor";
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
            <iframe
                src={url}
                title={title || t("topicView.pdf.viewPdf")}
                className="h-full w-full flex-1 border-0 bg-white"
            />
        </div>
    );
};

const TopicPdfViewerInner = ({ url, title }: TopicPdfViewerProps) => {
    const { t, dir } = useTranslation();
    const ChevronPrev = dir === "rtl" ? ChevronRight : ChevronLeft;
    const ChevronNext = dir === "rtl" ? ChevronLeft : ChevronRight;

    const shellRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
    const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
    const renderGenerationRef = useRef(0);

    const [pageNum, setPageNum] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [pdfReady, setPdfReady] = useState(0);
    const [loadingDoc, setLoadingDoc] = useState(true);
    const [renderingPage, setRenderingPage] = useState(false);
    const [useEmbedFallback, setUseEmbedFallback] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const destroyPdfDoc = useCallback(() => {
        renderTaskRef.current?.cancel();
        renderTaskRef.current = null;

        const doc = pdfDocRef.current;
        pdfDocRef.current = null;
        if (doc) {
            try {
                doc.destroy();
            } catch {
                // Ignore teardown errors during rapid media switches.
            }
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadDocument = async () => {
            setLoadingDoc(true);
            setUseEmbedFallback(false);
            setPageNum(1);
            setTotalPages(0);
            setPdfReady(0);
            destroyPdfDoc();

            try {
                const pdf = await loadPdfDocumentFromUrl(url);
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
                setPdfReady((value) => value + 1);
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

        void loadDocument();

        return () => {
            cancelled = true;
            destroyPdfDoc();
        };
    }, [url, destroyPdfDoc]);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const updateWidth = () => setContainerWidth(viewport.clientWidth);
        updateWidth();

        const observer = new ResizeObserver(updateWidth);
        observer.observe(viewport);
        return () => observer.disconnect();
    }, [useEmbedFallback]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    useEffect(() => {
        const pdfDoc = pdfDocRef.current;
        if (!pdfDoc || !canvasRef.current || containerWidth <= 0 || useEmbedFallback || pdfReady === 0) {
            return;
        }

        const generation = ++renderGenerationRef.current;
        let cancelled = false;

        const renderPage = async () => {
            setRenderingPage(true);

            try {
                const page = await pdfDoc.getPage(pageNum);
                if (cancelled || generation !== renderGenerationRef.current) return;

                const mobile = isMobileViewport();
                const maxPixels = mobile ? 1_800_000 : 4_000_000;
                const maxDimension = mobile ? 2048 : 4096;
                const deviceRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2);

                const baseViewport = page.getViewport({ scale: 1 });
                const horizontalPadding = 24;
                let renderScale = Math.max((containerWidth - horizontalPadding) / baseViewport.width, 0.2);
                let viewport = page.getViewport({ scale: renderScale });

                while (
                    viewport.width * viewport.height * deviceRatio * deviceRatio > maxPixels ||
                    viewport.width * deviceRatio > maxDimension ||
                    viewport.height * deviceRatio > maxDimension
                ) {
                    renderScale *= 0.85;
                    viewport = page.getViewport({ scale: renderScale });
                }

                const canvas = canvasRef.current;
                if (!canvas || cancelled || generation !== renderGenerationRef.current) return;

                const context = canvas.getContext("2d", { alpha: false });
                if (!context) return;

                canvas.width = Math.max(1, Math.floor(viewport.width * deviceRatio));
                canvas.height = Math.max(1, Math.floor(viewport.height * deviceRatio));
                canvas.style.width = `${Math.floor(viewport.width)}px`;
                canvas.style.height = `${Math.floor(viewport.height)}px`;
                context.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);

                renderTaskRef.current?.cancel();
                const task = page.render({
                    canvasContext: context,
                    viewport,
                });
                renderTaskRef.current = task;
                await task.promise;
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
            renderTaskRef.current?.cancel();
            renderTaskRef.current = null;
        };
    }, [pageNum, containerWidth, useEmbedFallback, pdfReady]);

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
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    if (useEmbedFallback) {
        return <TopicPdfEmbedFallback url={url} title={title} />;
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
                        <Button size="sm" variant="secondary" className="h-9 px-2 text-xs font-semibold" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                <span className="hidden sm:inline">{t("topicView.pdf.openNewWindow")}</span>
                            </a>
                        </Button>
                    </div>
                </div>
            </div>

            <div
                ref={viewportRef}
                className="relative flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-900"
            >
                {isBusy && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 backdrop-blur-[1px]">
                        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                        <p className="text-sm font-medium text-muted-foreground">{t("topicView.pdf.loading")}</p>
                    </div>
                )}

                <div className="flex min-h-full justify-center p-3 sm:p-5">
                    <div className="rounded-lg bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
                        <canvas
                            ref={canvasRef}
                            role="img"
                            aria-label={title || t("topicView.pdf.viewPdf")}
                            className="block max-w-none rounded-lg"
                        />
                    </div>
                </div>

                {!isBusy && totalPages === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">{t("topicView.pdf.loadError")}</p>
                    </div>
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

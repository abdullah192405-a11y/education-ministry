import { cn } from "@/lib/utils";

type EdgeType = "flat" | "tab" | "blank";

const PIECE_FILLS = [
    { from: "#fbbf24", to: "#f97316", stroke: "#ea580c" },
    { from: "#38bdf8", to: "#3b82f6", stroke: "#2563eb" },
    { from: "#4ade80", to: "#22c55e", stroke: "#16a34a" },
    { from: "#a78bfa", to: "#8b5cf6", stroke: "#7c3aed" },
    { from: "#fb7185", to: "#f43f5e", stroke: "#e11d48" },
    { from: "#2dd4bf", to: "#14b8a6", stroke: "#0d9488" },
];

function buildVerticalPiecePath(top: EdgeType, bottom: EdgeType): string {
    const w = 320;
    const h = 88;
    const r = 12;
    const tw = 40;
    const td = 14;
    const cx = w / 2;

    let d = `M ${r} 0 `;

    if (top === "tab") {
        d += `L ${cx - tw / 2} 0 C ${cx - tw / 4} 0 ${cx - tw / 4} ${-td} ${cx} ${-td} C ${cx + tw / 4} ${-td} ${cx + tw / 4} 0 ${cx + tw / 2} 0 `;
    } else if (top === "blank") {
        d += `L ${cx - tw / 2} 0 C ${cx - tw / 4} 0 ${cx - tw / 4} ${td} ${cx} ${td} C ${cx + tw / 4} ${td} ${cx + tw / 4} 0 ${cx + tw / 2} 0 `;
    }

    d += `L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} `;

    if (bottom === "tab") {
        d += `L ${cx + tw / 2} ${h} C ${cx + tw / 4} ${h} ${cx + tw / 4} ${h + td} ${cx} ${h + td} C ${cx - tw / 4} ${h + td} ${cx - tw / 4} ${h} ${cx - tw / 2} ${h} `;
    } else if (bottom === "blank") {
        d += `L ${cx + tw / 2} ${h} C ${cx + tw / 4} ${h} ${cx + tw / 4} ${h - td} ${cx} ${h - td} C ${cx - tw / 4} ${h - td} ${cx - tw / 4} ${h} ${cx - tw / 2} ${h} `;
    }

    d += `L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
    return d;
}

function buildHorizontalPiecePath(left: EdgeType, right: EdgeType): string {
    const w = 88;
    const h = 88;
    const r = 12;
    const tw = 40;
    const td = 14;
    const cy = h / 2;

    let d = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} `;

    if (right === "tab") {
        d += `L ${w} ${cy - tw / 2} C ${w} ${cy - tw / 4} ${w + td} ${cy - tw / 4} ${w + td} ${cy} C ${w + td} ${cy + tw / 4} ${w} ${cy + tw / 4} ${w} ${cy + tw / 2} `;
    } else if (right === "blank") {
        d += `L ${w} ${cy - tw / 2} C ${w} ${cy - tw / 4} ${w - td} ${cy - tw / 4} ${w - td} ${cy} C ${w - td} ${cy + tw / 4} ${w} ${cy + tw / 4} ${w} ${cy + tw / 2} `;
    }

    d += `L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} `;

    if (left === "tab") {
        d += `L 0 ${cy + tw / 2} C 0 ${cy + tw / 4} ${-td} ${cy + tw / 4} ${-td} ${cy} C ${-td} ${cy - tw / 4} 0 ${cy - tw / 4} 0 ${cy - tw / 2} `;
    } else if (left === "blank") {
        d += `L 0 ${cy + tw / 2} C 0 ${cy + tw / 4} ${td} ${cy + tw / 4} ${td} ${cy} C ${td} ${cy - tw / 4} 0 ${cy - tw / 4} 0 ${cy - tw / 2} `;
    }

    d += `L 0 ${r} Q 0 0 ${r} 0 Z`;
    return d;
}

export type PuzzlePieceStatus = "default" | "correct" | "wrong" | "selected" | "used";

interface PuzzlePieceProps {
    children: React.ReactNode;
    index?: number;
    total?: number;
    orientation?: "vertical" | "horizontal";
    status?: PuzzlePieceStatus;
    colorIndex?: number;
    className?: string;
    compact?: boolean;
}

export function PuzzlePiece({
    children,
    index = 0,
    total = 1,
    orientation = "vertical",
    status = "default",
    colorIndex,
    className,
    compact = false,
}: PuzzlePieceProps) {
    const ci = colorIndex ?? index;
    const palette = PIECE_FILLS[ci % PIECE_FILLS.length];
    const gradId = `puzzle-grad-${ci}-${orientation}-${index}`;

    let path: string;
    if (orientation === "horizontal") {
        const left: EdgeType = index === 0 ? "flat" : index % 2 === 0 ? "blank" : "tab";
        const right: EdgeType = index === total - 1 ? "flat" : index % 2 === 0 ? "tab" : "blank";
        path = buildHorizontalPiecePath(left, right);
    } else {
        const top: EdgeType = index === 0 ? "flat" : index % 2 === 0 ? "blank" : "tab";
        const bottom: EdgeType = index === total - 1 ? "flat" : index % 2 === 0 ? "tab" : "blank";
        path = buildVerticalPiecePath(top, bottom);
    }

    const overlap = orientation === "vertical" && index > 0 ? "-mt-3" : "";
    const viewBox =
        orientation === "horizontal"
            ? "-14 0 116 88"
            : "0 -14 320 116";

    return (
        <div
            className={cn(
                "relative select-none",
                overlap,
                orientation === "horizontal" && index > 0 && "-ms-3",
                className
            )}
        >
            <svg
                viewBox={viewBox}
                preserveAspectRatio="none"
                className={cn(
                    "absolute inset-0 h-full w-full drop-shadow-md",
                    status === "used" && "opacity-40"
                )}
                aria-hidden
            >
                <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={palette.from} />
                        <stop offset="100%" stopColor={palette.to} />
                    </linearGradient>
                </defs>
                <path
                    d={path}
                    fill={`url(#${gradId})`}
                    stroke={palette.stroke}
                    strokeWidth={2}
                    className={cn(
                        status === "correct" && "!fill-emerald-400 !stroke-emerald-600",
                        status === "wrong" && "!fill-red-400 !stroke-red-600",
                        status === "selected" && "brightness-110"
                    )}
                />
            </svg>
            <div
                className={cn(
                    "relative z-10 flex items-center justify-center text-white font-bold",
                    orientation === "vertical"
                        ? compact
                            ? "min-h-[72px] px-6 py-3"
                            : "min-h-[80px] px-8 py-4"
                        : compact
                          ? "min-h-[72px] min-w-[72px] px-2 py-2"
                          : "min-h-[80px] min-w-[80px] px-3 py-3",
                    status === "used" && "opacity-50"
                )}
            >
                {children}
            </div>
        </div>
    );
}

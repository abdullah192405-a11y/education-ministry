import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, CheckCircle2, XCircle } from "lucide-react";
import { PuzzlePiece } from "./PuzzlePiece";
import { cn } from "@/lib/utils";
import type { OrderPiece } from "@/lib/challengeItemNormalize";

interface OrderPuzzleBoardProps {
    pieces: OrderPiece[];
    onReorder: (pieces: OrderPiece[]) => void;
    showResult?: boolean;
    correctItems?: string[];
    disabled?: boolean;
}

function DraggablePiece({
    piece,
    index,
    total,
    showResult,
    correctItems,
    disabled,
}: {
    piece: OrderPiece;
    index: number;
    total: number;
    showResult?: boolean;
    correctItems?: string[];
    disabled?: boolean;
}) {
    const dragControls = useDragControls();
    const isCorrectPosition = showResult && correctItems?.[index] === piece.text;

    return (
        <Reorder.Item
            value={piece}
            dragListener={false}
            dragControls={dragControls}
            className={cn("list-none", disabled && "pointer-events-none")}
            whileDrag={{ scale: 1.03, zIndex: 50, rotate: -1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
            <PuzzlePiece
                index={index}
                total={total}
                orientation="vertical"
                status={showResult ? (isCorrectPosition ? "correct" : "wrong") : "default"}
            >
                <div className="flex w-full items-center gap-3 text-right">
                    {!showResult && !disabled && (
                        <button
                            type="button"
                            className="cursor-grab touch-none rounded p-1 text-white/70 hover:bg-white/20 active:cursor-grabbing"
                            onPointerDown={(e) => dragControls.start(e)}
                            aria-label="اسحب لإعادة الترتيب"
                        >
                            <GripVertical className="h-5 w-5" />
                        </button>
                    )}

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/25 text-sm font-black shadow-inner">
                        {index + 1}
                    </span>

                    <span className="flex-1 text-base font-semibold leading-snug drop-shadow-sm">
                        {piece.text}
                    </span>

                    {showResult && (
                        <span className="shrink-0">
                            {isCorrectPosition ? (
                                <CheckCircle2 className="h-5 w-5 text-white" />
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-white/90">
                                    <XCircle className="h-4 w-4" />
                                    {correctItems?.indexOf(piece.text) !== undefined &&
                                        correctItems.indexOf(piece.text) >= 0 &&
                                        `#${correctItems.indexOf(piece.text) + 1}`}
                                </span>
                            )}
                        </span>
                    )}
                </div>
            </PuzzlePiece>
        </Reorder.Item>
    );
}

export function OrderPuzzleBoard({
    pieces,
    onReorder,
    showResult = false,
    correctItems = [],
    disabled = false,
}: OrderPuzzleBoardProps) {
    return (
        <div className="mx-auto max-w-lg">
            <p className="mb-5 text-center text-sm text-muted-foreground">
                {showResult
                    ? "نتيجة الترتيب"
                    : "اسحب قطع الأحجية ورتّبها بالترتيب الصحيح"}
            </p>

            <Reorder.Group
                axis="y"
                values={pieces}
                onReorder={onReorder}
                className="flex flex-col gap-0"
            >
                {pieces.map((piece, index) => (
                    <DraggablePiece
                        key={piece.id}
                        piece={piece}
                        index={index}
                        total={pieces.length}
                        showResult={showResult}
                        correctItems={correctItems}
                        disabled={disabled || showResult}
                    />
                ))}
            </Reorder.Group>
        </div>
    );
}

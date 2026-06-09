import { Reorder } from "framer-motion";
import { GripVertical, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderPiece } from "@/lib/challengeItemNormalize";

interface OrderPuzzleBoardProps {
    pieces: OrderPiece[];
    onReorder: (pieces: OrderPiece[]) => void;
    showResult?: boolean;
    correctItems?: string[];
    disabled?: boolean;
}

function DraggableRow({
    piece,
    index,
    showResult,
    correctItems,
    disabled,
}: {
    piece: OrderPiece;
    index: number;
    showResult?: boolean;
    correctItems?: string[];
    disabled?: boolean;
}) {
    const isCorrectPosition = showResult && correctItems?.[index] === piece.text;
    const canDrag = !showResult && !disabled;

    let rowClass =
        "flex w-full items-center gap-3 p-4 rounded-xl border-2 text-right transition-all ";

    if (showResult) {
        rowClass += isCorrectPosition
            ? "border-green-500 bg-green-500/10"
            : "border-red-500 bg-red-500/10";
    } else {
        rowClass += "border-border bg-card hover:border-primary/40";
    }

    return (
        <Reorder.Item
            value={piece}
            className={cn(
                "list-none",
                disabled && "pointer-events-none",
                canDrag && "cursor-grab active:cursor-grabbing touch-none select-none"
            )}
            whileDrag={{ scale: 1.02, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", cursor: "grabbing" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            aria-label="اسحب لإعادة الترتيب"
        >
            <div className={rowClass}>
                {canDrag && (
                    <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground/50 pointer-events-none" />
                )}

                <span
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0",
                        showResult && isCorrectPosition
                            ? "bg-green-500 text-white"
                            : showResult
                              ? "bg-red-500 text-white"
                              : "bg-muted"
                    )}
                >
                    {index + 1}
                </span>

                <span className="flex-1 text-base font-medium leading-snug">{piece.text}</span>

                {showResult && (
                    <span className="shrink-0">
                        {isCorrectPosition ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                            <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                                <XCircle className="h-4 w-4" />
                                {correctItems?.indexOf(piece.text) !== undefined &&
                                    correctItems.indexOf(piece.text) >= 0 &&
                                    `#${correctItems.indexOf(piece.text) + 1}`}
                            </span>
                        )}
                    </span>
                )}
            </div>
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
        <div className="mx-auto max-w-lg space-y-3">
            <p className="text-center text-sm text-muted-foreground">
                {showResult ? "نتيجة الترتيب" : "اسحب العناصر لترتيبها بالشكل الصحيح"}
            </p>

            <Reorder.Group
                axis="y"
                values={pieces}
                onReorder={onReorder}
                className="flex flex-col gap-3"
            >
                {pieces.map((piece, index) => (
                    <DraggableRow
                        key={piece.id}
                        piece={piece}
                        index={index}
                        showResult={showResult}
                        correctItems={correctItems}
                        disabled={disabled || showResult}
                    />
                ))}
            </Reorder.Group>
        </div>
    );
}

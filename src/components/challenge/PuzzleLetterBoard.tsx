import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PuzzleLetterBoardProps {
    tiles: string[];
    usedIndices: number[];
    onTileClick: (tile: string, index: number) => void;
    disabled?: boolean;
    answerSlot?: React.ReactNode;
    showSpaceButton?: boolean;
    onSpaceClick?: () => void;
}

export function PuzzleLetterBoard({
    tiles,
    usedIndices,
    onTileClick,
    disabled = false,
    answerSlot,
    showSpaceButton = false,
    onSpaceClick,
}: PuzzleLetterBoardProps) {
    const usedSet = new Set(usedIndices);

    return (
        <div className="space-y-6">
            {answerSlot}

            <div className="flex flex-wrap items-center justify-center gap-3 px-2">
                {tiles.map((tile, index) => {
                    const used = usedSet.has(index);
                    const tileDisabled = disabled || !tile.trim() || used;

                    return (
                        <motion.button
                            key={`${tile}-${index}`}
                            type="button"
                            disabled={tileDisabled}
                            onClick={() => onTileClick(tile, index)}
                            whileHover={!tileDisabled ? { scale: 1.05, y: -2 } : undefined}
                            whileTap={!tileDisabled ? { scale: 0.95 } : undefined}
                            className={cn(
                                "min-w-[3.25rem] h-14 px-4 rounded-xl border-2 text-2xl font-black transition-all outline-none",
                                used
                                    ? "border-border bg-muted/40 text-muted-foreground opacity-40 cursor-not-allowed"
                                    : "border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10 cursor-pointer",
                                disabled && !used && "cursor-not-allowed opacity-50"
                            )}
                        >
                            {tile}
                        </motion.button>
                    );
                })}
                {showSpaceButton && onSpaceClick && (
                    <motion.button
                        type="button"
                        disabled={disabled}
                        onClick={onSpaceClick}
                        whileHover={!disabled ? { scale: 1.05, y: -2 } : undefined}
                        whileTap={!disabled ? { scale: 0.95 } : undefined}
                        className={cn(
                            "min-w-[4.5rem] h-14 px-4 rounded-xl border-2 text-base font-bold transition-all outline-none",
                            "border-secondary/40 bg-secondary/10 hover:border-secondary hover:bg-secondary/20 cursor-pointer",
                            disabled && "cursor-not-allowed opacity-50"
                        )}
                    >
                        مسافة
                    </motion.button>
                )}
            </div>
        </div>
    );
}

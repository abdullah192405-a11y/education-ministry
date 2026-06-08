import { motion } from "framer-motion";
import { PuzzlePiece } from "./PuzzlePiece";
import { cn } from "@/lib/utils";

interface PuzzleLetterBoardProps {
    tiles: string[];
    usedIndices: number[];
    onTileClick: (tile: string, index: number) => void;
    disabled?: boolean;
    answerSlot?: React.ReactNode;
}

export function PuzzleLetterBoard({
    tiles,
    usedIndices,
    onTileClick,
    disabled = false,
    answerSlot,
}: PuzzleLetterBoardProps) {
    const usedSet = new Set(usedIndices);

    return (
        <div className="space-y-8">
            {answerSlot}

            <div className="flex flex-wrap items-center justify-center gap-1 px-2">
                {tiles.map((tile, index) => {
                    const used = usedSet.has(index);
                    return (
                        <motion.button
                            key={`${tile}-${index}`}
                            type="button"
                            disabled={disabled || !tile.trim() || used}
                            onClick={() => onTileClick(tile, index)}
                            whileHover={!disabled && !used ? { scale: 1.08, y: -4 } : undefined}
                            whileTap={!disabled && !used ? { scale: 0.95 } : undefined}
                            className={cn(
                                "border-0 bg-transparent p-0 outline-none",
                                (disabled || used) && "cursor-not-allowed"
                            )}
                        >
                            <PuzzlePiece
                                index={index}
                                total={tiles.length}
                                orientation="horizontal"
                                status={used ? "used" : "default"}
                                compact
                            >
                                <span className="text-2xl font-black drop-shadow-md md:text-3xl">
                                    {tile}
                                </span>
                            </PuzzlePiece>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

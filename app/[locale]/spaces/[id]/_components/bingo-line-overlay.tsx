"use client";

import { motion } from "motion/react";
import type { BingoLine } from "@/lib/utils/bingo-checker";

interface BingoLineOverlayProps {
  bingoLines: BingoLine[];
  cardSize?: number;
}

/**
 * Renders SVG lines over completed bingo lines
 * Accounts for CSS Grid gap-2 spacing between cells
 */
export function BingoLineOverlay({
  bingoLines,
  cardSize = 5,
}: BingoLineOverlayProps) {
  if (bingoLines.length === 0) {
    return null;
  }

  // With gap-2, there's visual spacing between cells
  // Approximate gap as 0.1 relative to cell (1.0) for typical layouts
  const gapSize = 0.1;
  const cellSize = 1;

  // Calculate cell center positions accounting for gaps
  const getCellCenter = (index: number) => {
    // First cell center at 0.5, then add (cellSize + gapSize) for each subsequent cell
    return 0.5 + index * (cellSize + gapSize);
  };

  // Total viewBox size: 5 cells + 4 gaps
  const viewBoxSize = cardSize * cellSize + (cardSize - 1) * gapSize;

  return (
    <svg
      aria-label="Bingo line overlay"
      className="pointer-events-none absolute inset-0 h-full w-full"
      role="img"
      style={{ zIndex: 10 }}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
    >
      {bingoLines.map((line, index) => {
        let x1: number;
        let y1: number;
        let x2: number;
        let y2: number;

        if (line.type === "horizontal") {
          // Horizontal line across row
          const y = getCellCenter(line.index);
          y1 = y;
          y2 = y;
          x1 = 0.1;
          x2 = viewBoxSize - 0.1;
        } else if (line.type === "vertical") {
          // Vertical line down column
          const x = getCellCenter(line.index);
          x1 = x;
          x2 = x;
          y1 = 0.1;
          y2 = viewBoxSize - 0.1;
        } else if (line.index === 0) {
          // Diagonal from top-left to bottom-right
          x1 = 0.1;
          y1 = 0.1;
          x2 = viewBoxSize - 0.1;
          y2 = viewBoxSize - 0.1;
        } else {
          // Diagonal from top-right to bottom-left
          x1 = viewBoxSize - 0.1;
          y1 = 0.1;
          x2 = 0.1;
          y2 = viewBoxSize - 0.1;
        }

        return (
          <motion.line
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            // biome-ignore lint/suspicious/noArrayIndexKey: Index is stable for this use case
            key={index}
            stroke="#f59e0b"
            strokeLinecap="round"
            strokeWidth="0.25"
            transition={{ delay: index * 0.2, duration: 0.6 }}
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
          />
        );
      })}
    </svg>
  );
}

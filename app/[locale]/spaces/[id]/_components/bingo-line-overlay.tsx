"use client";

import { motion } from "motion/react";
import type { BingoLine } from "@/lib/utils/bingo-checker";

interface BingoLineOverlayProps {
  bingoLines: BingoLine[];
  cardSize?: number;
}

/**
 * Renders SVG lines over completed bingo lines
 * The grid uses gap-2 (0.5rem) between cells, so we need to account for gaps in coordinates
 * With 5 cells and 4 gaps: each cell gets (100 - 4*gap) / 5 space, gaps are between cells
 */
export function BingoLineOverlay({
  bingoLines,
  cardSize = 5,
}: BingoLineOverlayProps) {
  if (bingoLines.length === 0) {
    return null;
  }

  // Gap ratio: with gap-2 (0.5rem) in a grid, approximate gap as 0.2 relative to cell size
  // This maps to the visual grid with gaps where each cell + gap unit is ~1.2
  const gapRatio = 0.2;
  const cellSize = 1;
  const cellWithGap = cellSize + gapRatio;

  // Helper to calculate center position of a cell at given index
  const getCellCenter = (index: number) => {
    return index * cellWithGap + cellSize / 2;
  };

  // Padding from edges
  const padding = 0.05;
  const gridStart = padding;
  const gridEnd = (cardSize - 1) * cellWithGap + cellSize - padding;

  return (
    <svg
      aria-label="Bingo line overlay"
      className="pointer-events-none absolute inset-0 h-full w-full"
      role="img"
      style={{ zIndex: 10 }}
      viewBox={`0 0 ${cardSize * cellWithGap - gapRatio} ${cardSize * cellWithGap - gapRatio}`}
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
          x1 = gridStart;
          x2 = gridEnd;
        } else if (line.type === "vertical") {
          // Vertical line down column
          const x = getCellCenter(line.index);
          x1 = x;
          x2 = x;
          y1 = gridStart;
          y2 = gridEnd;
        } else if (line.index === 0) {
          // Diagonal from top-left to bottom-right
          x1 = gridStart;
          y1 = gridStart;
          x2 = gridEnd;
          y2 = gridEnd;
        } else {
          // Diagonal from top-right to bottom-left
          x1 = gridEnd;
          y1 = gridStart;
          x2 = gridStart;
          y2 = gridEnd;
        }

        return (
          <motion.line
            animate={{ pathLength: 1, opacity: 1 }}
            initial={{ pathLength: 0, opacity: 0 }}
            // biome-ignore lint/suspicious/noArrayIndexKey: Index is stable for this use case
            key={index}
            stroke="url(#bingoLineGradient)"
            strokeDasharray="1"
            strokeLinecap="round"
            strokeWidth="0.15"
            transition={{ delay: index * 0.2, duration: 0.6 }}
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
          />
        );
      })}
      <defs>
        <linearGradient
          id="bingoLineGradient"
          x1="0%"
          x2="100%"
          y1="0%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

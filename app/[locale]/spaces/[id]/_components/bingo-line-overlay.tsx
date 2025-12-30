"use client";

import { motion } from "motion/react";
import type { BingoLine } from "@/lib/utils/bingo-checker";

interface BingoLineOverlayProps {
  bingoLines: BingoLine[];
  cardSize?: number;
}

/**
 * Renders SVG lines over completed bingo lines
 * Each cell is 1x1 in the SVG coordinate system
 */
export function BingoLineOverlay({
  bingoLines,
  cardSize = 5,
}: BingoLineOverlayProps) {
  if (bingoLines.length === 0) {
    return null;
  }

  return (
    <svg
      aria-label="Bingo line overlay"
      className="pointer-events-none absolute inset-0 h-full w-full"
      role="img"
      style={{ zIndex: 10 }}
      viewBox={`0 0 ${cardSize} ${cardSize}`}
    >
      {bingoLines.map((line, index) => {
        let x1: number;
        let y1: number;
        let x2: number;
        let y2: number;

        if (line.type === "horizontal") {
          // Horizontal line across row
          y1 = line.index + 0.5;
          y2 = line.index + 0.5;
          x1 = 0.1;
          x2 = cardSize - 0.1;
        } else if (line.type === "vertical") {
          // Vertical line down column
          x1 = line.index + 0.5;
          x2 = line.index + 0.5;
          y1 = 0.1;
          y2 = cardSize - 0.1;
        } else if (line.index === 0) {
          // Diagonal from top-left to bottom-right
          x1 = 0.1;
          y1 = 0.1;
          x2 = cardSize - 0.1;
          y2 = cardSize - 0.1;
        } else {
          // Diagonal from top-right to bottom-left
          x1 = cardSize - 0.1;
          y1 = 0.1;
          x2 = 0.1;
          y2 = cardSize - 0.1;
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
        <linearGradient id="bingoLineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

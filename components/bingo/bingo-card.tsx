"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { BingoLine } from "@/lib/utils/bingo-checker";
import { BingoLineOverlay } from "./bingo-line-overlay";

interface Props {
  bingoLines?: BingoLine[];
  calledNumbers: Set<number>;
  cardNumbers: number[][];
  readonly?: boolean;
}

const FREE_SPACE_VALUE = 0;
const BINGO_BLUE = "#2563eb";
const BINGO_WHITE = "#ffffff";
const BINGO_BLACK = "#000000";
const BINGO_BORDER_GRAY = "#d1d5db";

function BingoCell({
  colIndex,
  isCalled,
  isFreeSpace,
  number,
  readonly = false,
  rowIndex,
  t,
}: {
  colIndex: number;
  isCalled: boolean;
  isFreeSpace: boolean;
  number: number;
  readonly?: boolean;
  rowIndex: number;
  t: (key: string) => string;
}) {
  const key = `${rowIndex}-${colIndex}`;

  return (
    <motion.div
      animate={
        isCalled
          ? {
              backgroundColor: BINGO_BLUE,
              color: BINGO_WHITE,
              scale: readonly ? 1 : [1, 1.1, 1],
            }
          : {
              backgroundColor: BINGO_WHITE,
              color: BINGO_BLACK,
            }
      }
      className="flex aspect-square items-center justify-center rounded border-2 font-bold text-xl"
      key={key}
      style={{
        borderColor: isCalled ? BINGO_BLUE : BINGO_BORDER_GRAY,
        cursor: readonly ? "default" : "pointer",
      }}
      transition={{ duration: readonly ? 0 : 0.3 }}
    >
      {isFreeSpace ? t("freeSpace") : number}
    </motion.div>
  );
}

export function BingoCard({
  cardNumbers,
  calledNumbers,
  bingoLines = [],
  readonly = false,
}: Props) {
  const t = useTranslations("UserSpace");

  const isNumberCalled = useMemo(
    () => (number: number) => {
      if (number === FREE_SPACE_VALUE) {
        return true;
      }
      return calledNumbers.has(number);
    },
    [calledNumbers]
  );

  return (
    <div className="w-full">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
        {["B", "I", "N", "G", "O"].map((letter) => (
          <div
            className="flex aspect-square items-center justify-center font-bold text-2xl text-blue-600"
            key={letter}
          >
            {letter}
          </div>
        ))}
      </div>

      <div className="relative mx-auto mt-2 grid max-w-md grid-cols-5 gap-2">
        {cardNumbers.map((row, rowIndex) =>
          row.map((number, colIndex) => {
            const isCalled = isNumberCalled(number);
            const isFreeSpace = number === FREE_SPACE_VALUE;
            const key = `cell-${rowIndex}-${colIndex}`;

            return (
              <BingoCell
                colIndex={colIndex}
                isCalled={isCalled}
                isFreeSpace={isFreeSpace}
                key={key}
                number={number}
                readonly={readonly}
                rowIndex={rowIndex}
                t={t}
              />
            );
          })
        )}
        {bingoLines.length > 0 && <BingoLineOverlay bingoLines={bingoLines} />}
      </div>
    </div>
  );
}

import { Fragment } from "react";

import { cn } from "@/lib/utils";

interface FormattedTextProps {
  className?: string;
  text: string | null | undefined;
}

const PARAGRAPH_REGEX = /\n{2,}/;

export const FormattedText = ({ text, className }: FormattedTextProps) => {
  if (!text) {
    return null;
  }

  // 改行コードを正規化（\r\n -> \n）
  const normalized = text.replace(/\r\n/g, "\n");

  // 連続改行（2回以上）で段落に分割
  const paragraphs = normalized.split(PARAGRAPH_REGEX);
  const paragraphCounts = new Map<string, number>();

  return (
    <div
      className={cn("prose max-w-none", className)}
      data-testid="formatted-text"
    >
      {paragraphs.map((paragraph) => {
        const paragraphOccurrence = (paragraphCounts.get(paragraph) ?? 0) + 1;
        paragraphCounts.set(paragraph, paragraphOccurrence);
        const paragraphKey = `p-${paragraph.slice(0, 20)}-${paragraphOccurrence}`;

        const lineCounts = new Map<string, number>();

        return (
          <p key={paragraphKey}>
            {paragraph.split("\n").map((line, _lineIndex, arr) => {
              const lineOccurrence = (lineCounts.get(line) ?? 0) + 1;
              lineCounts.set(line, lineOccurrence);

              return (
                <Fragment key={`l-${line.slice(0, 15)}-${lineOccurrence}`}>
                  {line}
                  {_lineIndex < arr.length - 1 && <br />}
                </Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
};

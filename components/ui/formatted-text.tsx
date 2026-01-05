import { Fragment } from "react";

import { cn } from "@/lib/utils";

interface FormattedTextProps {
  className?: string;
  text: string | null | undefined;
}

export const FormattedText = ({ text, className }: FormattedTextProps) => {
  if (!text) return null;

  // 改行コードを正規化（\r\n -> \n）
  const normalized = text.replace(/\r\n/g, "\n");

  // 連続改行（2回以上）で段落に分割
  const paragraphs = normalized.split(/\n{2,}/);

  return (
    <div className={cn(className)}>
      {paragraphs.map((paragraph, i) => (
        <p key={`p-${i}-${paragraph.slice(0, 20)}`} className="mb-4 last:mb-0 leading-relaxed">
          {paragraph.split("\n").map((line, j, arr) => (
            <Fragment key={`l-${i}-${j}-${line.slice(0, 15)}`}>
              {line}
              {j < arr.length - 1 && <br />}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
};

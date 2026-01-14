"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

interface ConditionalHeaderProps {
  children: ReactNode;
}

export function ConditionalHeader({ children }: ConditionalHeaderProps) {
  const pathname = usePathname();

  // ログインページではヘッダーを非表示（CSSで制御し、再マウントを防ぐ）
  const isHidden = pathname === "/login";

  return <div className={isHidden ? "hidden" : "contents"}>{children}</div>;
}

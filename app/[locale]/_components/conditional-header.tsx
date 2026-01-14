"use client";

import type { ReactNode } from "react";
import { Activity } from "react";
import { usePathname } from "@/i18n/navigation";

interface ConditionalHeaderProps {
  children: ReactNode;
}

export function ConditionalHeader({ children }: ConditionalHeaderProps) {
  const pathname = usePathname();

  // ログインページではヘッダーを非アクティブ化（再マウントを防ぐ）
  const isActive = pathname !== "/login";

  return <Activity mode={isActive ? "visible" : "hidden"}>{children}</Activity>;
}

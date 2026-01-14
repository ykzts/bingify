"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

interface ConditionalHeaderProps {
  children: ReactNode;
}

export function ConditionalHeader({ children }: ConditionalHeaderProps) {
  const pathname = usePathname();

  // ログインページではヘッダーを非表示
  if (pathname === "/login") {
    return null;
  }

  return <>{children}</>;
}

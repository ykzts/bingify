import { Suspense } from "react";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  "use cache: private";
  
  return (
    <Suspense fallback={<div />}>
      <QueryProvider>{children}</QueryProvider>
    </Suspense>
  );
}

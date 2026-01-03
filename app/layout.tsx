import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <QueryProvider>{children}</QueryProvider>;
}

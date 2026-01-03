import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return <QueryProvider>{children}</QueryProvider>;
}

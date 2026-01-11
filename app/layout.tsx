import { GoogleAnalytics } from "@next/third-parties/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { getGoogleAnalyticsMeasurementId } from "@/lib/analytics";
import "./globals.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  const gaId = getGoogleAnalyticsMeasurementId();

  return (
    <QueryProvider>
      {children}
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </QueryProvider>
  );
}

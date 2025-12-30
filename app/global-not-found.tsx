import "./globals.css";
import { FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const nunito = Nunito({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "404 Not Found | Bingify",
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className={`${nunito.variable} antialiased`}>
        <div className="container mx-auto px-4 py-16">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileQuestion className="h-20 w-20 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>Page Not Found</EmptyTitle>
              <EmptyDescription>
                The page you are looking for does not exist or has been moved.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </body>
    </html>
  );
}

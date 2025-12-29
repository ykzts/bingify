import "./globals.css";
import { FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyIcon,
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
            <EmptyIcon>
              <FileQuestion className="h-20 w-20 text-muted-foreground" />
            </EmptyIcon>
            <EmptyTitle as="h1">Page Not Found</EmptyTitle>
            <EmptyDescription>
              The page you are looking for does not exist or has been moved.
            </EmptyDescription>
            <EmptyAction>
              <Button asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </EmptyAction>
          </Empty>
        </div>
      </body>
    </html>
  );
}

import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyIcon,
  EmptyTitle,
} from "@/components/ui/empty";

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
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

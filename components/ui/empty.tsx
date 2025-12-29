import * as React from "react";

import { cn } from "@/lib/utils";

const Empty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50",
      className
    )}
    {...props}
  />
));
Empty.displayName = "Empty";

const EmptyIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-20 w-20 items-center justify-center", className)}
    {...props}
  />
));
EmptyIcon.displayName = "EmptyIcon";

const EmptyTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("mt-4 font-semibold text-lg", className)}
    {...props}
  />
));
EmptyTitle.displayName = "EmptyTitle";

const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("mb-4 mt-2 text-muted-foreground text-sm", className)}
    {...props}
  />
));
EmptyDescription.displayName = "EmptyDescription";

const EmptyAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mt-4", className)} {...props} />
));
EmptyAction.displayName = "EmptyAction";

export { Empty, EmptyAction, EmptyDescription, EmptyIcon, EmptyTitle };

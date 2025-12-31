"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const FieldSet = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => (
  <fieldset
    ref={ref}
    className={cn("space-y-4 border-none p-0", className)}
    {...props}
  />
));
FieldSet.displayName = "FieldSet";

const FieldSetLegend = React.forwardRef<
  HTMLLegendElement,
  React.HTMLAttributes<HTMLLegendElement>
>(({ className, ...props }, ref) => (
  <legend
    ref={ref}
    className={cn("font-semibold text-lg", className)}
    {...props}
  />
));
FieldSetLegend.displayName = "FieldSetLegend";

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props} />
));
FieldGroup.displayName = "FieldGroup";

export { FieldGroup, FieldSet, FieldSetLegend };

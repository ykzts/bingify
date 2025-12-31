"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const FieldContext = React.createContext<{
  errorId?: string;
  descriptionId?: string;
  fieldId?: string;
}>({});

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const fieldId = React.useId();
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;

  return (
    <FieldContext.Provider value={{ descriptionId, errorId, fieldId }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FieldContext.Provider>
  );
});
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  const { fieldId } = React.useContext(FieldContext);

  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      htmlFor={fieldId}
      {...props}
    />
  );
});
FieldLabel.displayName = "FieldLabel";

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { descriptionId } = React.useContext(FieldContext);

  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      id={descriptionId}
      {...props}
    />
  );
});
FieldDescription.displayName = "FieldDescription";

const FieldError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { errorId } = React.useContext(FieldContext);

  if (!children) {
    return null;
  }

  return (
    <p
      ref={ref}
      className={cn("text-sm text-destructive", className)}
      id={errorId}
      {...props}
    >
      {children}
    </p>
  );
});
FieldError.displayName = "FieldError";

export { Field, FieldDescription, FieldError, FieldLabel };

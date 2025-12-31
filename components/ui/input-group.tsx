"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  relative?: boolean;
}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, relative = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center",
        relative && "relative",
        className
      )}
      {...props}
    />
  )
);
InputGroup.displayName = "InputGroup";

const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => (
  <Input ref={ref} className={cn("flex-1", className)} {...props} />
));
InputGroupInput.displayName = "InputGroupInput";

interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "inline-start" | "inline-end";
}

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  InputGroupAddonProps
>(({ align = "inline-start", className, ...props }, ref) => {
  const isStart = align === "inline-start";

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-y-0 flex items-center",
        isStart ? "left-0 pl-3" : "right-0 pr-3",
        className
      )}
      {...props}
    />
  );
});
InputGroupAddon.displayName = "InputGroupAddon";

const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    className={cn("rounded-l-none", className)}
    type="button"
    {...props}
  />
));
InputGroupButton.displayName = "InputGroupButton";

const InputGroupText = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "flex h-9 select-none items-center border border-input bg-muted px-3 text-muted-foreground text-sm",
      className
    )}
    {...props}
  />
));
InputGroupText.displayName = "InputGroupText";

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
};

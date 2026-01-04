import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error-message";

interface FieldErrorsProps {
  className?: string;
  errors: unknown[];
}

/**
 * Reusable component for displaying field-level validation errors
 * Used with TanStack Form's field.state.meta.errors
 *
 * Example usage:
 * ```tsx
 * <form.Field name="email">
 *   {(field) => (
 *     <Field>
 *       <Input {...field} />
 *       <FieldErrors errors={field.state.meta.errors} />
 *     </Field>
 *   )}
 * </form.Field>
 * ```
 */
export function FieldErrors({ className, errors }: FieldErrorsProps) {
  if (!errors || errors.length === 0) {
    return null;
  }

  const errorMessages = errors
    .map((error) => getErrorMessage(error))
    .filter(
      (message) => message.trim() !== "" && message !== "[object Object]"
    );

  if (errorMessages.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 p-2",
        className
      )}
      role="alert"
    >
      {errorMessages.map((message, index) => (
        <p
          className="text-red-800 text-sm"
          key={`${message.slice(0, 20)}-${index}`}
        >
          {message}
        </p>
      ))}
    </div>
  );
}

interface InlineFieldErrorProps {
  children: ReactNode;
}

/**
 * Alternative variant for inline error display
 * Use when you want a more compact error message without background
 *
 * Example:
 * ```tsx
 * {field.state.meta.errors.length > 0 && (
 *   <InlineFieldError>
 *     {getErrorMessage(field.state.meta.errors[0])}
 *   </InlineFieldError>
 * )}
 * ```
 */
export function InlineFieldError({ children }: InlineFieldErrorProps) {
  return <p className="text-red-600 text-sm">{children}</p>;
}

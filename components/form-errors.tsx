import { AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";

interface FormErrorsProps {
  errors: unknown[];
  className?: string;
  variant?: "default" | "with-icon";
}

/**
 * Reusable component for displaying form-level validation errors
 * Filters out empty and malformed error messages
 * Uses composite keys (message + index) to handle potential duplicates while maintaining stability
 */
export function FormErrors({
  errors,
  className = "",
  variant = "default",
}: FormErrorsProps) {
  const errorMessages = errors
    .map((error) => getErrorMessage(error))
    .filter(
      (message) => message.trim() !== "" && message !== "[object Object]"
    );

  if (errorMessages.length === 0) {
    return null;
  }

  if (variant === "with-icon") {
    return (
      <div
        aria-live="polite"
        className={`flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-800 text-sm ${className}`}
        role="alert"
      >
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col gap-1">
          {errorMessages.map((message, index) => (
            <span key={`${message.slice(0, 20)}-${index}`}>{message}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
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

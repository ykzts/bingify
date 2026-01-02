import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getErrorMessage } from "@/lib/utils";

interface FormErrorsProps {
  className?: string;
  errors: unknown[];
  variant?: "default" | "with-icon";
}

/**
 * Reusable component for displaying form-level validation errors
 * Uses shadcn/ui Alert component for consistent styling
 * Filters out empty and malformed error messages
 * Uses composite keys (message + index) to handle potential duplicates while maintaining stability
 */
export function FormErrors({
  className = "",
  errors,
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
      <Alert className={className} variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex flex-col gap-1">
            {errorMessages.map((message, index) => (
              <span key={`${message.slice(0, 20)}-${index}`}>{message}</span>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={className} variant="destructive">
      <AlertDescription>
        {errorMessages.map((message, index) => (
          <p key={`${message.slice(0, 20)}-${index}`}>{message}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Extract error message from various error types
 * Handles TanStack Form validation errors, Zod issues, Error objects, and strings
 * @param error - Unknown error type from TanStack Form validation
 * @returns Human-readable error message string
 */
export function getErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (error == null) {
    return "";
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  // Handle objects with message property (Zod issues, Error-like objects)
  if (
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Handle arrays of errors (rare but possible)
  if (Array.isArray(error) && error.length > 0) {
    return getErrorMessage(error[0]);
  }

  // Handle objects with issues array (Zod error structure)
  if (
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray(error.issues) &&
    error.issues.length > 0
  ) {
    const firstIssue = error.issues[0];
    if (
      typeof firstIssue === "object" &&
      firstIssue !== null &&
      "message" in firstIssue
    ) {
      return String(firstIssue.message);
    }
  }

  // Fallback: convert to string (should rarely happen with proper validation)
  return String(error);
}

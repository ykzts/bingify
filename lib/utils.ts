import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * Replaces &, <, >, ", ', and / with their HTML entity equivalents
 */
export function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

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

  // Handle Zod issue objects (shape: { message: string, code: string, ... })
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

  // Fallback: convert to string (should rarely happen with proper validation)
  return String(error);
}

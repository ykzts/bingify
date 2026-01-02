import { describe, expect, it } from "vitest";
import { getErrorMessage } from "../error-message";

describe("getErrorMessage", () => {
  describe("handles null and undefined", () => {
    it("returns empty string for null", () => {
      expect(getErrorMessage(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(getErrorMessage(undefined)).toBe("");
    });
  });

  describe("handles string errors", () => {
    it("returns the string as-is", () => {
      expect(getErrorMessage("Simple error message")).toBe(
        "Simple error message"
      );
    });

    it("returns empty string for empty string input", () => {
      expect(getErrorMessage("")).toBe("");
    });
  });

  describe("handles Error instances", () => {
    it("extracts message from Error object", () => {
      const error = new Error("Error instance message");
      expect(getErrorMessage(error)).toBe("Error instance message");
    });

    it("handles TypeError", () => {
      const error = new TypeError("Type error message");
      expect(getErrorMessage(error)).toBe("Type error message");
    });

    it("handles custom Error subclasses", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }
      const error = new CustomError("Custom error message");
      expect(getErrorMessage(error)).toBe("Custom error message");
    });
  });

  describe("handles objects with message property", () => {
    it("extracts message from object", () => {
      const error = { message: "Object with message" };
      expect(getErrorMessage(error)).toBe("Object with message");
    });

    it("handles Zod-like issue objects", () => {
      const error = {
        code: "invalid_type",
        message: "Expected string, received number",
        path: ["field"],
      };
      expect(getErrorMessage(error)).toBe("Expected string, received number");
    });

    it("ignores message property if not a string", () => {
      const error = { message: 123 };
      expect(getErrorMessage(error)).toBe("[object Object]");
    });
  });

  describe("handles arrays of errors", () => {
    it("extracts message from first element", () => {
      const errors = ["First error", "Second error", "Third error"];
      expect(getErrorMessage(errors)).toBe("First error");
    });

    it("recursively processes first element", () => {
      const errors = [{ message: "Nested error message" }];
      expect(getErrorMessage(errors)).toBe("Nested error message");
    });

    it("handles empty arrays", () => {
      // Empty arrays fall through to the String() conversion
      expect(getErrorMessage([])).toBe("");
    });
  });

  describe("handles Zod error structure with issues array", () => {
    it("extracts message from first issue", () => {
      const zodError = {
        issues: [
          {
            code: "too_small",
            message: "String must contain at least 10 character(s)",
            path: ["message"],
          },
          {
            code: "invalid_type",
            message: "Expected string, received number",
            path: ["age"],
          },
        ],
      };
      expect(getErrorMessage(zodError)).toBe(
        "String must contain at least 10 character(s)"
      );
    });

    it("handles issues with non-message properties", () => {
      const zodError = {
        issues: [{ code: "custom", path: [] }],
      };
      expect(getErrorMessage(zodError)).toBe("[object Object]");
    });

    it("handles empty issues array", () => {
      const zodError = { issues: [] };
      expect(getErrorMessage(zodError)).toBe("[object Object]");
    });
  });

  describe("fallback behavior", () => {
    it("converts plain objects to string", () => {
      const obj = { foo: "bar", baz: 123 };
      expect(getErrorMessage(obj)).toBe("[object Object]");
    });

    it("converts numbers to string", () => {
      expect(getErrorMessage(42)).toBe("42");
    });

    it("converts booleans to string", () => {
      expect(getErrorMessage(true)).toBe("true");
      expect(getErrorMessage(false)).toBe("false");
    });

    it("handles symbols", () => {
      const sym = Symbol("test");
      expect(getErrorMessage(sym)).toContain("Symbol");
    });
  });

  describe("complex nested scenarios", () => {
    it("handles deeply nested error structures", () => {
      const error = {
        issues: [
          {
            message: "Validation failed",
            nested: {
              message: "Should not use this",
            },
          },
        ],
      };
      expect(getErrorMessage(error)).toBe("Validation failed");
    });

    it("handles array of Error instances", () => {
      const errors = [new Error("First error"), new Error("Second error")];
      expect(getErrorMessage(errors)).toBe("First error");
    });

    it("handles mixed error types in arrays", () => {
      const errors = [
        "String error",
        new Error("Error instance"),
        { message: "Object error" },
      ];
      expect(getErrorMessage(errors)).toBe("String error");
    });
  });

  describe("edge cases", () => {
    it("handles objects with null message", () => {
      const error = { message: null };
      expect(getErrorMessage(error)).toBe("[object Object]");
    });

    it("handles objects with undefined message", () => {
      const error = { message: undefined };
      expect(getErrorMessage(error)).toBe("[object Object]");
    });

    it("handles circular references gracefully", () => {
      const error: { message?: string; self?: unknown } = {
        message: "Circular error",
      };
      error.self = error;
      expect(getErrorMessage(error)).toBe("Circular error");
    });
  });
});

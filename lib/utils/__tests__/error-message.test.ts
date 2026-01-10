import { describe, expect, it } from "vitest";
import { getErrorMessage } from "../error-message";

describe("getErrorMessage", () => {
  describe("nullとundefinedを処理する", () => {
    it("nullに対して空文字列を返す", () => {
      expect(getErrorMessage(null)).toBe("");
    });

    it("undefinedに対して空文字列を返す", () => {
      expect(getErrorMessage(undefined)).toBe("");
    });
  });

  describe("文字列エラーを処理する", () => {
    it("文字列をそのまま返す", () => {
      expect(getErrorMessage("Simple error message")).toBe(
        "Simple error message"
      );
    });

    it("空文字列入力に対して空文字列を返す", () => {
      expect(getErrorMessage("")).toBe("");
    });
  });

  describe("Errorインスタンスを処理する", () => {
    it("ErrorオブジェクトからメッセージをExtractする", () => {
      const error = new Error("Error instance message");
      expect(getErrorMessage(error)).toBe("Error instance message");
    });

    it("TypeErrorを処理する", () => {
      const error = new TypeError("Type error message");
      expect(getErrorMessage(error)).toBe("Type error message");
    });

    it("カスタムErrorサブクラスを処理する", () => {
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

  describe("messageプロパティを持つオブジェクトを処理する", () => {
    it("オブジェクトからメッセージをExtractする", () => {
      const error = { message: "Object with message" };
      expect(getErrorMessage(error)).toBe("Object with message");
    });

    it("Zod風のissueオブジェクトを処理する", () => {
      const error = {
        code: "invalid_type",
        message: "Expected string, received number",
        path: ["field"],
      };
      expect(getErrorMessage(error)).toBe("Expected string, received number");
    });

    it("messageプロパティが文字列でない場合は無視する", () => {
      const error = { message: 123 };
      expect(getErrorMessage(error)).toBe("[object Object]");
    });
  });

  describe("エラーの配列を処理する", () => {
    it("最初の要素からメッセージをExtractする", () => {
      const errors = ["First error", "Second error", "Third error"];
      expect(getErrorMessage(errors)).toBe("First error");
    });

    it("最初の要素を再帰的に処理する", () => {
      const errors = [{ message: "Nested error message" }];
      expect(getErrorMessage(errors)).toBe("Nested error message");
    });

    it("空の配列を処理する", () => {
      expect(getErrorMessage([])).toBe("");
    });
  });

  describe("issues配列を持つZodエラー構造を処理する", () => {
    it("最初のissueからメッセージをExtractする", () => {
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

    it("メッセージ以外のプロパティを持つissuesを処理する", () => {
      const zodError = {
        issues: [{ code: "custom", path: [] }],
      };
      expect(getErrorMessage(zodError)).toBe("[object Object]");
    });

    it("空のissues配列を処理する", () => {
      const zodError = { issues: [] };
      expect(getErrorMessage(zodError)).toBe("[object Object]");
    });
  });

  describe("フォールバック動作", () => {
    it("プレーンオブジェクトを文字列に変換する", () => {
      const obj = { baz: 123, foo: "bar" };
      expect(getErrorMessage(obj)).toBe("[object Object]");
    });

    it("数値を文字列に変換する", () => {
      expect(getErrorMessage(42)).toBe("42");
    });

    it("真偽値を文字列に変換する", () => {
      expect(getErrorMessage(true)).toBe("true");
      expect(getErrorMessage(false)).toBe("false");
    });

    it("シンボルを処理する", () => {
      const sym = Symbol("test");
      expect(getErrorMessage(sym)).toContain("Symbol");
    });
  });

  describe("複雑なネストされたシナリオ", () => {
    it("深くネストされたエラー構造を処理する", () => {
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

    it("Errorインスタンスの配列を処理する", () => {
      const errors = [new Error("First error"), new Error("Second error")];
      expect(getErrorMessage(errors)).toBe("First error");
    });

    it("配列内の混在したエラータイプを処理する", () => {
      const errors = [
        "String error",
        new Error("Error instance"),
        { message: "Object error" },
      ];
      expect(getErrorMessage(errors)).toBe("String error");
    });
  });

  describe("エッジケース", () => {
    it("nullのmessageを持つオブジェクトを処理する", () => {
      const error = { message: null };
      expect(getErrorMessage(error)).toBe("[object Object]");
    });

    it("undefinedのmessageを持つオブジェクトを処理する", () => {
      const error = { message: undefined };
      expect(getErrorMessage(error)).toBe("[object Object]");
    });

    it("循環参照を適切に処理する", () => {
      const error: { message?: string; self?: unknown } = {
        message: "Circular error",
      };
      error.self = error;
      expect(getErrorMessage(error)).toBe("Circular error");
    });
  });
});

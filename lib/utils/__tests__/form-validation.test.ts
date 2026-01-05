import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodValidatorAdapter } from "../form-validation";

// テスト用の正規表現を定数として定義
const SHARE_KEY_REGEX = /^[a-z0-9-]+$/;
const UPPERCASE_REGEX = /[A-Z]/;

describe("zodValidatorAdapter", () => {
  describe("シンプルなスキーマの検証", () => {
    it("有効な値に対して undefined を返す", () => {
      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: { email: "test@example.com", name: "Test User" },
      });
      expect(result).toBeUndefined();
    });

    it("無効な値に対してエラーマップを返す", () => {
      const schema = z.object({
        email: z.string().email("有効なメールアドレスを入力してください"),
        name: z.string().min(1, "名前を入力してください"),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: { email: "invalid-email", name: "" },
      });

      expect(result).toBeDefined();
      expect(result?.email).toBe("有効なメールアドレスを入力してください");
      expect(result?.name).toBe("名前を入力してください");
    });

    it("単一のフィールドエラーを返す", () => {
      const schema = z.object({
        username: z.string().min(3, "ユーザー名は3文字以上必要です"),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: { username: "ab" },
      });

      expect(result).toBeDefined();
      expect(result?.username).toBe("ユーザー名は3文字以上必要です");
    });
  });

  describe("ネストされたスキーマの検証", () => {
    it("ネストされたオブジェクトのエラーをドット記法で返す", () => {
      const schema = z.object({
        features: z.object({
          gatekeeper: z.object({
            email: z.object({
              enabled: z.boolean(),
            }),
          }),
        }),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: {
          features: {
            gatekeeper: {
              email: {
                enabled: "not-a-boolean" as unknown as boolean,
              },
            },
          },
        },
      });

      expect(result).toBeDefined();
      // Zodのflatten()はネストされたパスをドット記法で返す
      expect(result?.["features.gatekeeper.email.enabled"]).toBeDefined();
    });

    it("複数階層のネストされたエラーを処理する", () => {
      const schema = z.object({
        settings: z.object({
          social: z.object({
            youtube: z.object({
              channelId: z
                .string()
                .min(1, "YouTubeチャンネルIDを入力してください"),
            }),
            twitch: z.object({
              broadcasterId: z
                .string()
                .min(1, "Twitch配信者IDを入力してください"),
            }),
          }),
        }),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: {
          settings: {
            social: {
              youtube: { channelId: "" },
              twitch: { broadcasterId: "" },
            },
          },
        },
      });

      expect(result).toBeDefined();
      expect(result?.["settings.social.youtube.channelId"]).toBe(
        "YouTubeチャンネルIDを入力してください"
      );
      expect(result?.["settings.social.twitch.broadcasterId"]).toBe(
        "Twitch配信者IDを入力してください"
      );
    });
  });

  describe("複雑なバリデーションルール", () => {
    it("正規表現バリデーションのエラーを処理する", () => {
      const schema = z.object({
        shareKey: z
          .string()
          .regex(SHARE_KEY_REGEX, "小文字の英数字とハイフンのみ使用できます"),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: { shareKey: "Invalid_Key!" },
      });

      expect(result).toBeDefined();
      expect(result?.shareKey).toBe("小文字の英数字とハイフンのみ使用できます");
    });

    it("カスタムバリデーションのエラーを処理する", () => {
      const schema = z.object({
        password: z
          .string()
          .min(8, "パスワードは8文字以上必要です")
          .refine(
            (val) => UPPERCASE_REGEX.test(val),
            "少なくとも1つの大文字が必要です"
          ),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: { password: "lowercase123" },
      });

      expect(result).toBeDefined();
      expect(result?.password).toBe("少なくとも1つの大文字が必要です");
    });

    it("数値の範囲バリデーションを処理する", () => {
      const schema = z.object({
        age: z
          .number()
          .min(0, "年齢は0以上である必要があります")
          .max(150, "年齢は150以下である必要があります"),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: { age: -5 },
      });

      expect(result).toBeDefined();
      expect(result?.age).toBe("年齢は0以上である必要があります");
    });
  });

  describe("配列フィールドの検証", () => {
    it("配列要素のエラーを処理する", () => {
      const schema = z.object({
        tags: z.array(z.string().min(1, "タグは空にできません")),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: { tags: ["valid", "", "also-valid"] },
      });

      expect(result).toBeDefined();
      // 配列のエラーはインデックス付きのパスで返される
      expect(result?.["tags.1"]).toBe("タグは空にできません");
    });
  });

  describe("エッジケース", () => {
    it("空のオブジェクトに対してフォームレベルのエラーを返す", () => {
      const schema = z
        .object({
          field1: z.string(),
          field2: z.string(),
        })
        .refine(
          (data) => data.field1 !== data.field2,
          "フィールドは異なる値である必要があります"
        );
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: { field1: "same", field2: "same" },
      });

      expect(result).toBeDefined();
      expect(result?.form).toBe("フィールドは異なる値である必要があります");
    });

    it("複数のエラーがある場合、最初のエラーのみを返す", () => {
      const schema = z.object({
        email: z
          .string()
          .min(1, "メールアドレスを入力してください")
          .email("有効なメールアドレスを入力してください"),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: { email: "" },
      });

      expect(result).toBeDefined();
      // Zodは最初のエラーを返す
      expect(result?.email).toBe("メールアドレスを入力してください");
    });

    it("すべてのフィールドが有効な場合は undefined を返す", () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0),
      });
      const validator = zodValidatorAdapter(schema);
      const result = validator({
        value: { age: 25, email: "test@example.com", name: "Test" },
      });

      expect(result).toBeUndefined();
    });
  });

  describe("実際のフォームスキーマのテスト", () => {
    it("contact-form スキーマを処理する", () => {
      const contactFormSchema = z.object({
        email: z
          .string()
          .min(1, "メールアドレスを入力してください")
          .email("有効なメールアドレスを入力してください"),
        message: z.string().min(10, "本文は10文字以上入力してください"),
        name: z.string().min(1, "名前を入力してください"),
      });

      const validator = zodValidatorAdapter(contactFormSchema);
      const result = validator({
        value: { email: "", message: "short", name: "" },
      });

      expect(result).toBeDefined();
      expect(result?.email).toBe("メールアドレスを入力してください");
      expect(result?.message).toBe("本文は10文字以上入力してください");
      expect(result?.name).toBe("名前を入力してください");
    });

    it("create-space-form スキーマを処理する", () => {
      const createSpaceFormSchema = z.object({
        share_key: z
          .string()
          .min(3, "3文字以上入力してください")
          .max(30, "30文字以内で入力してください")
          .regex(SHARE_KEY_REGEX, "小文字の英数字とハイフンのみ使用できます"),
      });

      const validator = zodValidatorAdapter(createSpaceFormSchema);
      const result = validator({
        value: { share_key: "ab" },
      });

      expect(result).toBeDefined();
      expect(result?.share_key).toBe("3文字以上入力してください");
    });
  });
});

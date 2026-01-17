import { describe, expect, it } from "vitest";
import { AuthHookPayloadSchema } from "@/lib/schemas/auth-hook";

describe("Auth Hook Payload", () => {
  describe("AuthHookPayloadSchema validation", () => {
    it("メール送信用の完全なペイロードを検証する", () => {
      const payload = {
        email_data: {
          email_action_type: "signup",
          factor_type: "",
          old_email: "",
          old_phone: "",
          provider: "",
          redirect_to: "https://example.com",
          site_url: "https://example.com",
          token: "token123",
          token_hash: "hash123456789012345678901234",
          token_hash_new: "",
          token_new: "",
        },
        user: {
          aud: "authenticated",
          created_at: "2024-01-01T00:00:00Z",
          email: "user@example.com",
          id: "user-id",
          is_anonymous: false,
          phone: "+1234567890",
          role: "authenticated",
          updated_at: "2024-01-01T00:00:00Z",
        },
      };

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success && result.data.email_data) {
        expect(result.data.email_data.email_action_type).toBe("signup");
        expect(result.data.email_data.token).toBe("token123");
      }
    });

    it("recovery タイプのペイロードを検証する", () => {
      const payload = {
        email_data: {
          email_action_type: "recovery",
          factor_type: "",
          old_email: "",
          old_phone: "",
          provider: "",
          redirect_to: "https://example.com",
          site_url: "https://example.com",
          token: "recovery_token",
          token_hash: "recovery_hash",
          token_hash_new: "",
          token_new: "",
        },
        user: {
          email: "user@example.com",
        },
      };

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success && result.data.email_data) {
        expect(result.data.email_data.email_action_type).toBe("recovery");
        expect(result.data.email_data.token).toBe("recovery_token");
      }
    });

    it("email_change タイプのペイロードを検証する", () => {
      const payload = {
        email_data: {
          email_action_type: "email_change",
          factor_type: "",
          old_email: "oldemail@example.com",
          old_phone: "",
          provider: "",
          redirect_to: "https://example.com",
          site_url: "https://example.com",
          token: "token",
          token_hash: "old_hash",
          token_hash_new: "new_hash",
          token_new: "new_token",
        },
        user: {
          email: "user@example.com",
        },
      };

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success && result.data.email_data) {
        expect(result.data.email_data.email_action_type).toBe("email_change");
        expect(result.data.email_data.old_email).toBe("oldemail@example.com");
        expect(result.data.email_data.token_new).toBe("new_token");
      }
    });

    it("invite タイプのペイロードを検証する", () => {
      const payload = {
        email_data: {
          email_action_type: "invite",
          factor_type: "",
          old_email: "",
          old_phone: "",
          provider: "",
          redirect_to: "https://example.com",
          site_url: "https://example.com",
          token: "invite_token",
          token_hash: "invite_hash",
          token_hash_new: "",
          token_new: "",
        },
        user: {
          email: "user@example.com",
        },
      };

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success && result.data.email_data) {
        expect(result.data.email_data.email_action_type).toBe("invite");
        expect(result.data.email_data.token).toBe("invite_token");
      }
    });

    it("カスタムmetadataフィールドを受け入れる", () => {
      const payload = {
        email_data: {
          email_action_type: "signup",
          factor_type: "",
          old_email: "",
          old_phone: "",
          provider: "",
          redirect_to: "https://example.com",
          site_url: "https://example.com",
          token: "token",
          token_hash: "hash",
          token_hash_new: "",
          token_new: "",
        },
        user: {
          app_metadata: {
            language: "ja",
            provider: "email",
          },
          email: "user@example.com",
          user_metadata: {
            email: "user@example.com",
            language: "ja",
          },
        },
      };

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user?.app_metadata?.language).toBe("ja");
        expect(result.data.user?.user_metadata?.language).toBe("ja");
      }
    });

    it("空のペイロードを受け入れる（すべてoptional）", () => {
      const payload = {};

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
    });
  });
});

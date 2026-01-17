import { describe, expect, it } from "vitest";
import { AuthHookPayloadSchema } from "@/lib/schemas/auth-hook";

describe("Auth Hook Schema", () => {
  describe("AuthHookPayloadSchema", () => {
    it("新しい形式（email_data）のペイロードを検証する", () => {
      const payload = {
        email_data: {
          email_action_type: "signup",
          factor_type: "",
          old_email: "",
          old_phone: "",
          provider: "",
          redirect_to: "https://example.com",
          site_url: "https://example.com",
          token: "123456",
          token_hash: "hash123456789012345678901234",
          token_hash_new: "newhash12345678901234567890",
          token_new: "newtoken12345678901234567890",
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
        expect(result.data.user?.email).toBe("user@example.com");
      }
    });

    it("email_action_typeのenumバリデーションが機能する", () => {
      const validTypes = [
        "signup",
        "invite",
        "magiclink",
        "recovery",
        "email_change",
        "email",
        "reauthentication",
        "password_changed_notification",
        "email_changed_notification",
        "phone_changed_notification",
        "identity_linked_notification",
        "identity_unlinked_notification",
        "mfa_factor_enrolled_notification",
        "mfa_factor_unenrolled_notification",
      ];

      for (const type of validTypes) {
        const payload = {
          email_data: {
            email_action_type: type,
            factor_type: "",
            old_email: "",
            old_phone: "",
            provider: "",
            redirect_to: "",
            site_url: "",
            token: "",
            token_hash: "",
            token_hash_new: "",
            token_new: "",
          },
        };

        const result = AuthHookPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });

    it("無効なemail_action_typeを拒否する", () => {
      const payload = {
        email_data: {
          email_action_type: "invalid_type",
          factor_type: "",
          old_email: "",
          old_phone: "",
          provider: "",
          redirect_to: "",
          site_url: "",
          token: "",
          token_hash: "",
          token_hash_new: "",
          token_new: "",
        },
      };

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
    });

    it("部分的なペイロード（一部のフィールドのみ）を受け入れる", () => {
      const payload = {
        email_data: {
          email_action_type: "recovery",
          factor_type: "",
          old_email: "",
          old_phone: "",
          provider: "",
          redirect_to: "https://example.com",
          site_url: "https://example.com",
          token: "token123",
          token_hash: "",
          token_hash_new: "",
          token_new: "",
        },
        user: {
          email: "user@example.com",
        },
      };

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email_data?.token).toBe("token123");
        expect(result.data.email_data?.token_hash).toBe("");
      }
    });

    it("user.app_metadataのカスタムlanguageフィールドを受け入れる", () => {
      const payload = {
        email_data: {
          email_action_type: "signup",
          factor_type: "",
          old_email: "",
          old_phone: "",
          provider: "",
          redirect_to: "",
          site_url: "",
          token: "",
          token_hash: "",
          token_hash_new: "",
          token_new: "",
        },
        user: {
          app_metadata: {
            language: "ja",
            provider: "email",
          },
          email: "user@example.com",
        },
      };

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user?.app_metadata?.language).toBe("ja");
      }
    });

    it("user.user_metadataのカスタムlanguageフィールドを受け入れる", () => {
      const payload = {
        email_data: {
          email_action_type: "signup",
          factor_type: "",
          old_email: "",
          old_phone: "",
          provider: "",
          redirect_to: "",
          site_url: "",
          token: "",
          token_hash: "",
          token_hash_new: "",
          token_new: "",
        },
        user: {
          email: "user@example.com",
          user_metadata: {
            email: "user@example.com",
            language: "en",
          },
        },
      };

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user?.user_metadata?.language).toBe("en");
      }
    });

    it("空のペイロードでも検証が成功する（すべてoptional）", () => {
      const payload = {};

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
    });

    it("identitiesフィールドを含む完全なuserオブジェクトを受け入れる", () => {
      const payload = {
        email_data: {
          email_action_type: "signup",
          factor_type: "",
          old_email: "",
          old_phone: "",
          provider: "",
          redirect_to: "",
          site_url: "",
          token: "",
          token_hash: "",
          token_hash_new: "",
          token_new: "",
        },
        user: {
          email: "user@example.com",
          id: "user-id",
          identities: [
            {
              created_at: "2024-01-01T00:00:00Z",
              email: "user@example.com",
              id: "identity-id",
              identity_data: {
                email: "user@example.com",
                email_verified: true,
                sub: "user-id",
              },
              identity_id: "identity-id",
              last_sign_in_at: "2024-01-01T00:00:00Z",
              provider: "email",
              updated_at: "2024-01-01T00:00:00Z",
              user_id: "user-id",
            },
          ],
        },
      };

      const result = AuthHookPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user?.identities).toHaveLength(1);
        expect(result.data.user?.identities?.[0]?.provider).toBe("email");
      }
    });
  });
});

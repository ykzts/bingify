import { describe, it, expect } from "vitest";
import { normalizeAuthHookPayload } from "@/lib/schemas/auth-hook";

describe("Auth Hook Payload Normalization", () => {
  describe("normalizeAuthHookPayload", () => {
    it("無効なペイロード構造の場合は null を返す", () => {
      const payload = {
        invalid: true,
      };

      const result = normalizeAuthHookPayload(payload);

      expect(result).toBeNull();
    });

    it("confirmation タイプのペイロードを処理する", () => {
      const payload = {
        data: {
          email_action_type: "signup",
          token: "token123",
          token_hash: "hash123",
        },
        type: "user.confirmation",
      };

      const result = normalizeAuthHookPayload(payload);

      expect(result).toBeDefined();
      if (result) {
        expect(result.email.confirmation_token).toBe("token123");
        expect(result.email.confirmation_hash).toBe("hash123");
      }
    });

    it("recovery タイプのペイロードを処理する", () => {
      const payload = {
        data: {
          email_action_type: "recovery",
          token: "recovery_token",
          token_hash: "recovery_hash",
        },
        type: "user.recovery",
      };

      const result = normalizeAuthHookPayload(payload);

      expect(result).toBeDefined();
      if (result) {
        expect(result.email.recovery_token).toBe("recovery_token");
        expect(result.email.recovery_token_hash).toBe("recovery_hash");
      }
    });

    it("email_change タイプのペイロードを処理する", () => {
      const payload = {
        data: {
          email_action_type: "email_change",
          old_email: "oldemail@example.com",
          token: "token",
          token_hash: "hash",
          token_new: "new_token",
          token_hash_new: "new_hash",
        },
        type: "user.email_change",
      };

      const result = normalizeAuthHookPayload(payload);

      expect(result).toBeDefined();
      if (result) {
        expect(result.email.change_email_old_new).toBe("oldemail@example.com");
      }
    });

    it("invite タイプのペイロードを処理する", () => {
      const payload = {
        data: {
          email_action_type: "invite",
          token: "invite_token",
          token_hash: "invite_hash",
        },
        type: "user.invite",
      };

      const result = normalizeAuthHookPayload(payload);

      expect(result).toBeDefined();
      if (result) {
        expect(result.email.invite_token).toBe("invite_token");
        expect(result.email.invite_token_hash).toBe("invite_hash");
      }
    });

    it("site_url を正規化する", () => {
      const payload = {
        data: {
          email_action_type: "signup",
          site_url: "http://localhost:3000/path/to/page?query=value",
          token: "token",
          token_hash: "hash",
        },
        type: "user.confirmation",
      };

      const result = normalizeAuthHookPayload(payload);

      expect(result).toBeDefined();
      if (result) {
        // サイト URL は origin に正規化されます
        expect(result.siteUrlOverride).toBe("http://localhost:3000");
      }
    });
  });
});

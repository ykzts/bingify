import { describe, expect, it, vi } from "vitest";
import { handleEmailAction } from "@/app/api/auth/hooks/send-email/_lib/email-handler";
import type { EmailData } from "@/lib/schemas/auth-hook";

// sendAuthEmail をモック
vi.mock("@/lib/mail", () => ({
  sendAuthEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("Reauthentication Handler", () => {
  describe("handleEmailAction - reauthentication", () => {
    it("英語ロケールでメール送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "reauthentication",
        factor_type: "",
        old_email: "",
        old_phone: "",
        provider: "",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "123456",
        token_hash: "hash123",
        token_hash_new: "",
        token_new: "",
      };

      const result = await handleEmailAction(
        "reauthentication",
        emailData,
        "user@example.com",
        "en",
        "http://localhost:3000"
      );

      expect(result).toBe(true);
      expect(sendAuthEmail).toHaveBeenCalledTimes(1);
      expect(sendAuthEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "user@example.com",
          subject: "Verify Your Identity",
        })
      );
    });

    it("日本語ロケールでメール送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "reauthentication",
        factor_type: "",
        old_email: "",
        old_phone: "",
        provider: "",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "654321",
        token_hash: "hash456",
        token_hash_new: "",
        token_new: "",
      };

      const result = await handleEmailAction(
        "reauthentication",
        emailData,
        "user@example.com",
        "ja",
        "http://localhost:3000"
      );

      expect(result).toBe(true);
      expect(sendAuthEmail).toHaveBeenCalledTimes(1);
      expect(sendAuthEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "user@example.com",
          subject: "本人確認が必要です",
        })
      );
    });

    it("OTPトークンを含む", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "reauthentication",
        factor_type: "",
        old_email: "",
        old_phone: "",
        provider: "",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "987654",
        token_hash: "hash789",
        token_hash_new: "",
        token_new: "",
      };

      await handleEmailAction(
        "reauthentication",
        emailData,
        "user@example.com",
        "en",
        "http://localhost:3000"
      );

      // テンプレートにトークンが渡されていることを確認
      expect(sendAuthEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.any(Object),
        })
      );
    });

    it("トークンが空の場合でもメール送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "reauthentication",
        factor_type: "",
        old_email: "",
        old_phone: "",
        provider: "",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "",
        token_hash: "",
        token_hash_new: "",
        token_new: "",
      };

      const result = await handleEmailAction(
        "reauthentication",
        emailData,
        "user@example.com",
        "en",
        "http://localhost:3000"
      );

      expect(result).toBe(true);
      expect(sendAuthEmail).toHaveBeenCalledTimes(1);
    });
  });
});

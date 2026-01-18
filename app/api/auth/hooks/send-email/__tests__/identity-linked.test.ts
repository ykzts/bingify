import { describe, expect, it, vi } from "vitest";
import { handleEmailAction } from "@/app/api/auth/hooks/send-email/_lib/email-handler";
import type { EmailData } from "@/lib/schemas/auth-hook";

// sendAuthEmail をモック
vi.mock("@/lib/mail", () => ({
  sendAuthEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("Identity Linked Handler", () => {
  describe("handleEmailAction - identity_linked_notification", () => {
    it("英語ロケールでメール送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "identity_linked_notification",
        factor_type: "",
        old_email: "",
        old_phone: "",
        provider: "Google",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "",
        token_hash: "",
        token_hash_new: "",
        token_new: "",
      };

      const result = await handleEmailAction(
        "identity_linked_notification",
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
          subject: "External Provider Linked",
        })
      );
    });

    it("日本語ロケールでメール送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "identity_linked_notification",
        factor_type: "",
        old_email: "",
        old_phone: "",
        provider: "GitHub",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "",
        token_hash: "",
        token_hash_new: "",
        token_new: "",
      };

      const result = await handleEmailAction(
        "identity_linked_notification",
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
          subject: "外部プロバイダーがリンクされました",
        })
      );
    });

    it("プロバイダー名を含む", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "identity_linked_notification",
        factor_type: "",
        old_email: "",
        old_phone: "",
        provider: "Twitch",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "",
        token_hash: "",
        token_hash_new: "",
        token_new: "",
      };

      await handleEmailAction(
        "identity_linked_notification",
        emailData,
        "user@example.com",
        "en",
        "http://localhost:3000"
      );

      expect(sendAuthEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.any(Object),
        })
      );
    });

    it("プロバイダーが空の場合でもメール送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "identity_linked_notification",
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
        "identity_linked_notification",
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

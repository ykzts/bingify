import { describe, expect, it, vi } from "vitest";
import { handleEmailAction } from "@/app/api/auth/hooks/send-email/_lib/email-handler";
import type { EmailData } from "@/lib/schemas/auth-hook";

// sendAuthEmail をモック
vi.mock("@/lib/mail", () => ({
  sendAuthEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("Email Change Handler", () => {
  describe("handleEmailAction - email_change", () => {
    it("double_confirm_changes 無効時は新メールアドレスのみに送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "email_change",
        factor_type: "",
        old_email: "",
        old_phone: "",
        provider: "",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "",
        token_hash: "",
        token_hash_new: "new_hash",
        token_new: "new_token",
      };

      const result = await handleEmailAction(
        "email_change",
        emailData,
        "newemail@example.com",
        "ja",
        "http://localhost:3000"
      );

      expect(result).toBe(true);
      expect(sendAuthEmail).toHaveBeenCalledTimes(1);
      expect(sendAuthEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "newemail@example.com",
          subject: "メールアドレス変更の確認",
        })
      );
    });

    it("double_confirm_changes 有効時は新旧両方のメールアドレスに送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "email_change",
        factor_type: "",
        old_email: "oldemail@example.com",
        old_phone: "",
        provider: "",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "old_token",
        token_hash: "old_hash",
        token_hash_new: "new_hash",
        token_new: "new_token",
      };

      const result = await handleEmailAction(
        "email_change",
        emailData,
        "newemail@example.com",
        "ja",
        "http://localhost:3000"
      );

      expect(result).toBe(true);
      expect(sendAuthEmail).toHaveBeenCalledTimes(2);

      // 1回目: 新メールアドレスへの送信
      expect(sendAuthEmail).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          recipient: "newemail@example.com",
          subject: "メールアドレス変更の確認",
        })
      );

      // 2回目: 旧メールアドレスへの送信
      expect(sendAuthEmail).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          recipient: "oldemail@example.com",
          subject: "メールアドレス変更の確認",
        })
      );
    });

    it("英語ロケールでメール送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "email_change",
        factor_type: "",
        old_email: "oldemail@example.com",
        old_phone: "",
        provider: "",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "old_token",
        token_hash: "old_hash",
        token_hash_new: "new_hash",
        token_new: "new_token",
      };

      const result = await handleEmailAction(
        "email_change",
        emailData,
        "newemail@example.com",
        "en",
        "http://localhost:3000"
      );

      expect(result).toBe(true);
      expect(sendAuthEmail).toHaveBeenCalledTimes(2);

      // 英語の件名を確認
      expect(sendAuthEmail).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          subject: "Confirm Your Email Change",
        })
      );

      expect(sendAuthEmail).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          subject: "Confirm Your Email Change",
        })
      );
    });

    it("旧メールアドレスが存在するが旧トークンがない場合は新メールのみに送信", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const emailData: EmailData = {
        email_action_type: "email_change",
        factor_type: "",
        old_email: "oldemail@example.com",
        old_phone: "",
        provider: "",
        redirect_to: "http://localhost:3000",
        site_url: "http://localhost:3000",
        token: "",
        token_hash: "",
        token_hash_new: "new_hash",
        token_new: "new_token",
      };

      const result = await handleEmailAction(
        "email_change",
        emailData,
        "newemail@example.com",
        "ja",
        "http://localhost:3000"
      );

      expect(result).toBe(true);
      // 新メールアドレスのみに送信
      expect(sendAuthEmail).toHaveBeenCalledTimes(1);
      expect(sendAuthEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "newemail@example.com",
        })
      );
    });
  });
});

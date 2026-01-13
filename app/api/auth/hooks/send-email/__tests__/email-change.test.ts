import { describe, expect, it, vi } from "vitest";
import { handleEmailAction } from "@/app/api/auth/hooks/send-email/_lib/email-handler";
import type { NormalizedEmail } from "@/lib/schemas/auth-hook";

// sendAuthEmail をモック
vi.mock("@/lib/mail", () => ({
  sendAuthEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("Email Change Handler", () => {
  describe("handleEmailAction - email_change", () => {
    it("double_confirm_changes 無効時は新メールアドレスのみに送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      vi.mocked(sendAuthEmail).mockClear();

      const email: NormalizedEmail = {
        change_email_new_token_new: "new_token",
        change_email_new_token_new_hash: "new_hash",
        email_action_type: "email_change",
      };

      const result = await handleEmailAction(
        "email_change",
        email,
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

      const email: NormalizedEmail = {
        change_email_new_token_new: "new_token",
        change_email_new_token_new_hash: "new_hash",
        change_email_old_new: "oldemail@example.com",
        change_email_old_token: "old_token",
        change_email_old_token_hash: "old_hash",
        email_action_type: "email_change",
      };

      const result = await handleEmailAction(
        "email_change",
        email,
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

      const email: NormalizedEmail = {
        change_email_new_token_new: "new_token",
        change_email_new_token_new_hash: "new_hash",
        change_email_old_new: "oldemail@example.com",
        change_email_old_token: "old_token",
        change_email_old_token_hash: "old_hash",
        email_action_type: "email_change",
      };

      const result = await handleEmailAction(
        "email_change",
        email,
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

      const email: NormalizedEmail = {
        change_email_new_token_new: "new_token",
        change_email_new_token_new_hash: "new_hash",
        change_email_old_new: "oldemail@example.com",
        // 旧トークンが欠けている
        email_action_type: "email_change",
      };

      const result = await handleEmailAction(
        "email_change",
        email,
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

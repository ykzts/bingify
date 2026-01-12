import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// nodemailerモジュール全体をモック
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
    })),
  },
}));

describe("Mail Functions", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  const originalMailFrom = process.env.MAIL_FROM;

  beforeEach(() => {
    // console.logをスパイ
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
      // モック実装: 何もしない
    });
    // MAIL_FROM環境変数を設定
    process.env.MAIL_FROM = "test@example.com";
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.env.MAIL_FROM = originalMailFrom;
    vi.clearAllMocks();
  });

  describe("sendAuthEmail", () => {
    it("認証メール関数が定義されている", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      expect(typeof sendAuthEmail).toBe("function");
    });

    it("有効なパラメータで正常にメール送信する", async () => {
      const { sendAuthEmail } = await import("@/lib/mail");
      const { default: nodemailerModule } = await import("nodemailer");

      const testTemplate = React.createElement("div", {}, "Test Email");

      await expect(
        sendAuthEmail({
          recipient: "test@example.com",
          subject: "Test Subject",
          template: testTemplate,
        })
      ).resolves.toBeUndefined();

      expect(nodemailerModule.createTransport).toHaveBeenCalled();
    });

    it("DEBUG_EMAIL_LOGが有効な場合にHTMLをログ出力する", async () => {
      const originalEnv = process.env.DEBUG_EMAIL_LOG;

      try {
        process.env.DEBUG_EMAIL_LOG = "true";

        // モジュールキャッシュをクリアして新しい環境で再インポート
        vi.resetModules();
        const { sendAuthEmail } = await import("@/lib/mail");

        const testTemplate = React.createElement("div", {}, "Debug Test");

        await sendAuthEmail({
          recipient: "debug@example.com",
          subject: "Debug Test",
          template: testTemplate,
        });

        // console.logがHTML出力で呼ばれたか確認
        expect(consoleLogSpy).toHaveBeenCalledWith(
          "📬 Generated auth email",
          expect.objectContaining({
            subject: "Debug Test",
            to: "debug@example.com",
          })
        );
      } finally {
        process.env.DEBUG_EMAIL_LOG = originalEnv;
        vi.resetModules();
      }
    });

    it("DEBUG_EMAIL_LOGがfalseの場合にHTMLをログ出力しない", async () => {
      const originalEnv = process.env.DEBUG_EMAIL_LOG;

      try {
        process.env.DEBUG_EMAIL_LOG = "false";

        vi.resetModules();
        const { sendAuthEmail } = await import("@/lib/mail");

        const testTemplate = React.createElement("div", {}, "Production Test");

        await sendAuthEmail({
          recipient: "prod@example.com",
          subject: "Production Test",
          template: testTemplate,
        });

        // console.logがHTML出力で呼ばれていないことを確認
        expect(consoleLogSpy).not.toHaveBeenCalledWith(
          "📬 Generated auth email",
          expect.any(Object)
        );
      } finally {
        process.env.DEBUG_EMAIL_LOG = originalEnv;
        vi.resetModules();
      }
    });

    it("送信エラー時に例外をスローする", async () => {
      // エラーをスローするトランスポーターをモック
      vi.resetModules();
      vi.doMock("nodemailer", () => ({
        default: {
          createTransport: vi.fn(() => ({
            sendMail: vi
              .fn()
              .mockRejectedValue(new Error("SMTP connection failed")),
          })),
        },
      }));

      const { sendAuthEmail } = await import("@/lib/mail");
      const testTemplate = React.createElement("div", {}, "Error Test");

      await expect(
        sendAuthEmail({
          recipient: "error@example.com",
          subject: "Error Test",
          template: testTemplate,
        })
      ).rejects.toThrow("SMTP connection failed");
    });
  });
});

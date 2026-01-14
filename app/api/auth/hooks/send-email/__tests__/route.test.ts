import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/auth/hooks/send-email/route";

describe("Auth Hook Endpoint", () => {
  describe("GET /api/auth/hooks/send-email", () => {
    it("シークレットが設定されている場合、status: ok を返す", () => {
      // SEND_EMAIL_HOOK_SECRETS を設定
      vi.stubEnv("SEND_EMAIL_HOOK_SECRETS", "v1,whsec_test1234567890");

      const response = GET();

      expect(response.status).toBe(200);

      // レスポンスボディを取得
      response.json().then((body) => {
        expect(body).toEqual({
          configuration: {
            hasSecret: true,
            secretFormat: "valid",
          },
          endpoint: "/api/auth/hooks/send-email",
          message: "Auth hook endpoint is configured and ready",
          status: "ok",
        });
      });

      vi.unstubAllEnvs();
    });

    it("シークレットが未設定の場合、503を返す", () => {
      // SEND_EMAIL_HOOK_SECRETS を未設定にする
      vi.stubEnv("SEND_EMAIL_HOOK_SECRETS", "");

      const response = GET();

      expect(response.status).toBe(503);

      response.json().then((body) => {
        expect(body.status).toBe("ok");
        expect(body.configuration.hasSecret).toBe(false);
        expect(body.message).toContain("WARNING");
      });

      vi.unstubAllEnvs();
    });

    it("シークレットの形式が不完全な場合、部分的な形式として検出する", () => {
      // 不完全な形式のシークレット (v1, で始まるが whsec_ がない)
      vi.stubEnv("SEND_EMAIL_HOOK_SECRETS", "v1,incomplete");

      const response = GET();

      expect(response.status).toBe(200);

      response.json().then((body) => {
        expect(body.configuration.secretFormat).toBe("partial");
      });

      vi.unstubAllEnvs();
    });

    it("シークレットの形式が無効な場合、無効な形式として検出する", () => {
      // 無効な形式のシークレット
      vi.stubEnv("SEND_EMAIL_HOOK_SECRETS", "invalid_secret");

      const response = GET();

      expect(response.status).toBe(200);

      response.json().then((body) => {
        expect(body.configuration.secretFormat).toBe("invalid");
      });

      vi.unstubAllEnvs();
    });
  });
});

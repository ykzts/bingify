import { describe, expect, it } from "vitest";
import { validateSecretFormat } from "../secret-validator";

describe("validateSecretFormat", () => {
  it("正しい形式（v1,whsec_xxx）の場合、valid を返す", () => {
    const result = validateSecretFormat("v1,whsec_abcdefghijklmnop");
    expect(result).toBe("valid");
  });

  it("v1, で始まるが whsec_ がない場合、v1 (incomplete) を返す", () => {
    const result = validateSecretFormat("v1,incomplete");
    expect(result).toBe("v1 (incomplete)");
  });

  it("v1, で始まらない場合、other を返す", () => {
    const result = validateSecretFormat("invalid_format");
    expect(result).toBe("other");
  });

  it("空文字列の場合、not set を返す", () => {
    const result = validateSecretFormat("");
    expect(result).toBe("not set");
  });

  it("undefined の場合、not set を返す", () => {
    const result = validateSecretFormat(undefined);
    expect(result).toBe("not set");
  });

  it("v1,whsec_ で終わる場合（base64文字列なし）も valid と判定する", () => {
    // 技術的には不完全だが、startsWith チェックのため valid になる
    const result = validateSecretFormat("v1,whsec_");
    expect(result).toBe("valid");
  });
});

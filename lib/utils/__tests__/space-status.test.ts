import { describe, expect, it } from "vitest";
import { getSpaceStatusTranslationKey } from "../space-status";

describe("space-status", () => {
  describe("getSpaceStatusTranslationKey", () => {
    describe("Dashboard 名前空間", () => {
      it('"active" ステータスの翻訳キーを返す', () => {
        const result = getSpaceStatusTranslationKey("active", "Dashboard");
        expect(result).toBe("statusActive");
      });

      it('"draft" ステータスの翻訳キーを返す', () => {
        const result = getSpaceStatusTranslationKey("draft", "Dashboard");
        expect(result).toBe("statusDraft");
      });

      it('"closed" ステータスの翻訳キーを返す', () => {
        const result = getSpaceStatusTranslationKey("closed", "Dashboard");
        expect(result).toBe("statusClosed");
      });

      it('null ステータスの場合は "statusClosed" を返す', () => {
        const result = getSpaceStatusTranslationKey(null, "Dashboard");
        expect(result).toBe("statusClosed");
      });

      it("名前空間が指定されていない場合は Dashboard をデフォルトで使用する", () => {
        const result = getSpaceStatusTranslationKey("active");
        expect(result).toBe("statusActive");
      });
    });

    describe("AdminSpace 名前空間", () => {
      it('"active" ステータスの翻訳キーを返す', () => {
        const result = getSpaceStatusTranslationKey("active", "AdminSpace");
        expect(result).toBe("settingsStatusActive");
      });

      it('"draft" ステータスの翻訳キーを返す', () => {
        const result = getSpaceStatusTranslationKey("draft", "AdminSpace");
        expect(result).toBe("settingsStatusDraft");
      });

      it('"closed" ステータスの翻訳キーを返す', () => {
        const result = getSpaceStatusTranslationKey("closed", "AdminSpace");
        expect(result).toBe("settingsStatusClosed");
      });

      it('null ステータスの場合は "settingsStatusClosed" を返す', () => {
        const result = getSpaceStatusTranslationKey(null, "AdminSpace");
        expect(result).toBe("settingsStatusClosed");
      });
    });
  });
});

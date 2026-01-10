import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateShort,
  formatDateSuffix,
  formatDateTime,
} from "../date-format";

// Regex patterns for formatDateTime tests
const DATE_EN_PATTERN = /Jan 10, 2024/;
const DATE_JA_PATTERN = /2024\/1\/10/;
const TIME_PATTERN = /\d{1,2}:\d{2}:\d{2}/;
const DATE_SUFFIX_PATTERN = /^\d{8}$/;

describe("date-format", () => {
  describe("formatDate", () => {
    it("英語ロケールで長形式の日付をフォーマットする", () => {
      const date = new Date("2024-01-10T12:30:45Z");
      const result = formatDate(date, "en");
      expect(result).toBe("January 10, 2024");
    });

    it("日本語ロケールで長形式の日付をフォーマットする", () => {
      const date = new Date("2024-01-10T12:30:45Z");
      const result = formatDate(date, "ja");
      expect(result).toBe("2024年1月10日");
    });

    it("文字列の日付をフォーマットする", () => {
      const result = formatDate("2024-01-10T12:30:45Z", "en");
      expect(result).toBe("January 10, 2024");
    });

    it("タイムスタンプ（ミリ秒）の日付をフォーマットする", () => {
      const timestamp = new Date("2024-01-10T12:30:45Z").getTime();
      const result = formatDate(timestamp, "en");
      expect(result).toBe("January 10, 2024");
    });

    it("無効な日付の場合は '-' を返す", () => {
      const result = formatDate("invalid-date", "en");
      expect(result).toBe("-");
    });
  });

  describe("formatDateShort", () => {
    it("英語ロケールで短形式の日付をフォーマットする", () => {
      const date = new Date("2024-01-10T12:30:45Z");
      const result = formatDateShort(date, "en");
      expect(result).toBe("Jan 10, 2024");
    });

    it("日本語ロケールで短形式の日付をフォーマットする", () => {
      const date = new Date("2024-01-10T12:30:45Z");
      const result = formatDateShort(date, "ja");
      expect(result).toBe("2024/1/10");
    });

    it("文字列の日付をフォーマットする", () => {
      const result = formatDateShort("2024-01-10T12:30:45Z", "en");
      expect(result).toBe("Jan 10, 2024");
    });

    it("無効な日付の場合は '-' を返す", () => {
      const result = formatDateShort("invalid-date", "en");
      expect(result).toBe("-");
    });
  });

  describe("formatDateTime", () => {
    it("英語ロケールで日時をフォーマットする", () => {
      const date = new Date("2024-01-10T15:45:30Z");
      const result = formatDateTime(date, "en");
      // タイムゾーンによって結果が異なるため、基本的な形式のみ確認
      expect(result).toMatch(DATE_EN_PATTERN);
      expect(result).toMatch(TIME_PATTERN);
    });

    it("日本語ロケールで日時をフォーマットする", () => {
      const date = new Date("2024-01-10T15:45:30Z");
      const result = formatDateTime(date, "ja");
      // タイムゾーンによって結果が異なるため、基本的な形式のみ確認
      expect(result).toMatch(DATE_JA_PATTERN);
      expect(result).toMatch(TIME_PATTERN);
    });

    it("文字列の日付をフォーマットする", () => {
      const result = formatDateTime("2024-01-10T15:45:30Z", "en");
      expect(result).toMatch(DATE_EN_PATTERN);
    });

    it("無効な日付の場合は '-' を返す", () => {
      const result = formatDateTime("invalid-date", "en");
      expect(result).toBe("-");
    });
  });

  describe("formatDateSuffix", () => {
    it("yyyyMMdd 形式でフォーマットする", () => {
      const date = new Date("2024-01-10T12:30:45Z");
      const result = formatDateSuffix(date);
      expect(result).toBe("20240110");
    });

    it("月と日が1桁の場合はゼロパディングする", () => {
      const date = new Date("2024-03-05T12:30:45Z");
      const result = formatDateSuffix(date);
      expect(result).toBe("20240305");
    });

    it("文字列の日付をフォーマットする", () => {
      const result = formatDateSuffix("2024-01-10T12:30:45Z");
      expect(result).toBe("20240110");
    });

    it("タイムスタンプ（ミリ秒）の日付をフォーマットする", () => {
      const timestamp = new Date("2024-01-10T12:30:45Z").getTime();
      const result = formatDateSuffix(timestamp);
      expect(result).toBe("20240110");
    });

    it("引数なしの場合は現在の日付をフォーマットする", () => {
      const result = formatDateSuffix();
      expect(result).toMatch(DATE_SUFFIX_PATTERN);
    });

    it("無効な日付の場合は空文字を返す", () => {
      const result = formatDateSuffix("invalid-date");
      expect(result).toBe("");
    });
  });
});

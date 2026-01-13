import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateShort,
  formatDateSuffix,
  formatDateTime,
  formatRelativeTime,
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

  describe("formatRelativeTime", () => {
    it("数秒前の時刻を相対表示する（英語）", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 30 * 1000);
      const result = formatRelativeTime(past, "en");
      expect(result).toContain("second");
    });

    it("数分前の時刻を相対表示する（英語）", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 5 * 60 * 1000);
      const result = formatRelativeTime(past, "en");
      expect(result).toContain("minute");
    });

    it("数時間前の時刻を相対表示する（英語）", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const result = formatRelativeTime(past, "en");
      expect(result).toContain("hour");
    });

    it("数日前の時刻を相対表示する（英語）", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(past, "en");
      expect(result).toContain("day");
    });

    it("数週間前の時刻を相対表示する（英語）", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 2 * 7 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(past, "en");
      expect(result).toContain("week");
    });

    it("数ヶ月前の時刻を相対表示する（英語）", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(past, "en");
      expect(result).toContain("month");
    });

    it("数年前の時刻を相対表示する（英語）", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(past, "en");
      expect(result).toContain("year");
    });

    it("日本語ロケールで相対時刻をフォーマットする", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 5 * 60 * 1000);
      const result = formatRelativeTime(past, "ja");
      expect(result).toContain("分");
    });

    it("文字列の日付をフォーマットする", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 5 * 60 * 1000);
      const result = formatRelativeTime(past.toISOString(), "en");
      expect(result).toContain("minute");
    });

    it("無効な日付の場合は '-' を返す", () => {
      const result = formatRelativeTime("invalid-date", "en");
      expect(result).toBe("-");
    });
  });
});

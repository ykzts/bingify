import { describe, expect, it, vi } from "vitest";
import {
  getGoogleAnalyticsMeasurementId,
  isGoogleAnalyticsEnabled,
} from "../analytics";

describe("getGoogleAnalyticsMeasurementId", () => {
  it("環境変数が設定されている場合、測定IDを返す", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-XXXXXXXXXX");
    expect(getGoogleAnalyticsMeasurementId()).toBe("G-XXXXXXXXXX");
    vi.unstubAllEnvs();
  });

  it("環境変数が設定されていない場合、undefinedを返す", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", undefined);
    expect(getGoogleAnalyticsMeasurementId()).toBeUndefined();
    vi.unstubAllEnvs();
  });
});

describe("isGoogleAnalyticsEnabled", () => {
  it("測定IDが設定されている場合、trueを返す", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-XXXXXXXXXX");
    expect(isGoogleAnalyticsEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });

  it("測定IDが空文字列の場合、falseを返す", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    expect(isGoogleAnalyticsEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });

  it("測定IDが未設定の場合、falseを返す", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", undefined);
    expect(isGoogleAnalyticsEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});

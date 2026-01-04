import { describe, expect, it } from "vitest";
import { parseTwitchInput } from "@/lib/twitch";

describe("Twitch lookup route", () => {
  describe("input parsing integration", () => {
    it("should handle numeric IDs", () => {
      const result = parseTwitchInput("123456789");
      expect(result).toEqual({
        type: "id",
        value: "123456789",
      });
    });

    it("should handle usernames", () => {
      const result = parseTwitchInput("ninja");
      expect(result).toEqual({
        type: "username",
        value: "ninja",
      });
    });

    it("should handle full URLs", () => {
      const result = parseTwitchInput("https://www.twitch.tv/ninja");
      expect(result).toEqual({
        type: "username",
        value: "ninja",
      });
    });

    it("should handle URLs without protocol", () => {
      const result = parseTwitchInput("twitch.tv/ninja");
      expect(result).toEqual({
        type: "username",
        value: "ninja",
      });
    });

    it("should handle invalid inputs", () => {
      const result = parseTwitchInput("abc");
      expect(result.type).toBe("invalid");
    });
  });
});

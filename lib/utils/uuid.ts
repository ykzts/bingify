import { z } from "zod";

export function isValidUUID(value: string): boolean {
  return z.uuid().safeParse(value).success;
}

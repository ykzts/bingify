/**
 * Validate and categorize the format of SEND_EMAIL_HOOK_SECRETS
 *
 * @param secret - The secret value to validate
 * @returns The format category: "valid", "v1 (incomplete)", "other", or "not set"
 */
export function validateSecretFormat(
  secret: string | undefined
): "valid" | "v1 (incomplete)" | "other" | "not set" {
  if (!secret) {
    return "not set";
  }

  if (secret.startsWith("v1,whsec_")) {
    return "valid";
  }

  if (secret.startsWith("v1,")) {
    return "v1 (incomplete)";
  }

  return "other";
}

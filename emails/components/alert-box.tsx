import { Section, Text } from "@react-email/components";
import { getTranslations } from "next-intl/server";

interface AlertBoxProps {
  children: React.ReactNode;
}

/**
 * Warning alert box component
 * Used for security warnings and important notices in red/warning color
 */
export function WarningBox({ children }: AlertBoxProps) {
  return <Section style={warningBoxStyle}>{children}</Section>;
}

/**
 * Success alert box component
 * Used for confirmation messages and success notices in green color
 */
export function SuccessBox({ children }: AlertBoxProps) {
  return <Section style={successBoxStyle}>{children}</Section>;
}

/**
 * Info alert box component
 * Used for informational content in blue color
 */
export function InfoBox({ children }: AlertBoxProps) {
  return <Section style={infoBoxStyle}>{children}</Section>;
}

/**
 * OTP display section component
 * Used to highlight one-time passwords in monospace font
 */
export async function OtpSection({
  code,
  locale = "en",
}: {
  code: string;
  locale?: string;
}) {
  const t = await getTranslations({ locale, namespace: "EmailTemplates" });
  const label = t("otpCodeLabel");

  return (
    <Section style={otpSectionStyle}>
      <Text style={otpLabelStyle}>{label}</Text>
      <Text style={otpCodeStyle}>{code}</Text>
    </Section>
  );
}

const warningBoxStyle = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  margin: "30px 0",
  padding: "20px",
};

const successBoxStyle = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #86efac",
  borderRadius: "8px",
  margin: "30px 0",
  padding: "20px",
};

const infoBoxStyle = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  margin: "30px 0",
  padding: "20px",
};

const otpSectionStyle = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  margin: "30px 0",
  padding: "20px",
  textAlign: "center" as const,
};

const otpLabelStyle = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 10px 0",
};

const otpCodeStyle = {
  color: "#a78bfa",
  fontFamily: "'Courier New', monospace",
  fontSize: "32px",
  fontWeight: "700" as const,
  letterSpacing: "8px",
  margin: "10px 0",
};

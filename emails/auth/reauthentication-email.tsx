import { Body, Html, Preview, Section, Text } from "@react-email/components";
import { getTranslations } from "next-intl/server";
import { OtpSection, WarningBox } from "../components/alert-box";
import { EmailContainer } from "../components/email-container";
import { EmailFooter } from "../components/email-footer";
import { EmailHeader } from "../components/email-header";

export interface ReauthenticationEmailProps {
  locale?: string;
  token: string;
}

/**
 * Reauthentication email template
 * Sent when a user needs to verify their identity for sensitive operations
 * Contains a 6-digit OTP code for verification
 */
export async function ReauthenticationEmail({
  locale = "en",
  token,
}: ReauthenticationEmailProps) {
  const t = await getTranslations({
    locale,
    namespace: "ReauthenticationEmail",
  });

  return (
    <Html lang={locale}>
      <Preview>{t("subject")}</Preview>
      <Body style={bodyStyle}>
        <EmailContainer>
          <EmailHeader title={t("title")} />

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{t("greeting")}</Text>
            <Text style={textStyle}>{t("text")}</Text>

            <OtpSection code={token} locale={locale} />

            <Text style={expirationStyle}>{t("expirationNote")}</Text>

            <WarningBox>
              <Text style={warningTextStyle}>{t("securityWarning")}</Text>
            </WarningBox>
          </Section>

          <EmailFooter companyName="Bingify" locale={locale} />
        </EmailContainer>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f5f5f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  lineHeight: "1.6",
  margin: "0",
  padding: "0",
};

const contentStyle = {
  padding: "40px 30px",
};

const greetingStyle = {
  color: "#333333",
  fontSize: "16px",
  margin: "0 0 20px 0",
};

const textStyle = {
  color: "#333333",
  fontSize: "16px",
  margin: "0 0 20px 0",
};

const expirationStyle = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "20px 0",
};

const warningTextStyle = {
  color: "#991b1b",
  fontSize: "14px",
  margin: "0",
};

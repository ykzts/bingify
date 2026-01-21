import { Body, Html, Preview, Section, Text } from "@react-email/components";
import { getTranslations } from "next-intl/server";
import { OtpSection } from "../components/alert-box";
import { EmailButton } from "../components/email-button";
import { EmailContainer } from "../components/email-container";
import { EmailFooter } from "../components/email-footer";
import { EmailHeader } from "../components/email-header";

export interface ConfirmationEmailProps {
  confirmationUrl: string;
  locale?: string;
  token: string;
}

/**
 * Confirmation email template for email address verification
 * Sent when a user signs up to verify their email address
 */
export async function ConfirmationEmail({
  confirmationUrl,
  locale = "en",
  token,
}: ConfirmationEmailProps) {
  const t = await getTranslations({
    locale,
    namespace: "EmailTemplateConfirmation",
  });

  return (
    <Html lang={locale}>
      <Preview>{t("subject")}</Preview>
      <Body style={bodyStyle}>
        <EmailContainer>
          <EmailHeader title={t("title")} />

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{t("greeting")}</Text>
            <Text style={textStyle}>{t("welcomeText")}</Text>

            <EmailButton href={confirmationUrl} text={t("buttonText")} />

            <OtpSection code={token} locale={locale} />

            <Text style={footerTextStyle}>{t("ignoredMessage")}</Text>
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

const footerTextStyle = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0",
};

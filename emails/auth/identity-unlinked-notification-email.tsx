import { Body, Html, Preview, Section, Text } from "@react-email/components";
import { getTranslations } from "next-intl/server";
import { InfoBox, SuccessBox, WarningBox } from "../components/alert-box";
import { EmailContainer } from "../components/email-container";
import { EmailFooter } from "../components/email-footer";
import { EmailHeader } from "../components/email-header";

export interface IdentityUnlinkedNotificationEmailProps {
  locale?: string;
  provider?: string;
}

/**
 * Identity unlinked notification email template
 * Sent to notify users when an external provider is unlinked from their account
 */
export async function IdentityUnlinkedNotificationEmail({
  locale = "en",
  provider = "",
}: IdentityUnlinkedNotificationEmailProps) {
  const t = await getTranslations({
    locale,
    namespace: "IdentityUnlinkedNotificationEmail",
  });

  return (
    <Html lang={locale}>
      <Preview>{t("subject")}</Preview>
      <Body style={bodyStyle}>
        <EmailContainer>
          <EmailHeader title={t("subject")} />

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{t("greeting")}</Text>

            <SuccessBox>
              <Text style={successTextStyle}>{t("successMessage")}</Text>
            </SuccessBox>

            {provider && (
              <Text style={providerInfoStyle}>
                {t("providerLabel")} {provider}
              </Text>
            )}

            <InfoBox>
              <Text style={infoTextStyle}>{t("accountAccessInfo")}</Text>
            </InfoBox>

            <WarningBox>
              <Text style={warningTitleStyle}>{t("securityNoticeTitle")}</Text>
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

const successTextStyle = {
  color: "#166534",
  fontSize: "16px",
  margin: "0",
};

const providerInfoStyle = {
  color: "#333333",
  fontSize: "16px",
  fontWeight: "600" as const,
  margin: "20px 0",
};

const infoTextStyle = {
  color: "#1f2937",
  fontSize: "14px",
  margin: "0",
};

const warningTitleStyle = {
  color: "#991b1b",
  fontSize: "16px",
  fontWeight: "600" as const,
  margin: "0 0 10px 0",
};

const warningTextStyle = {
  color: "#991b1b",
  fontSize: "14px",
  margin: "0",
};

import { Body, Html, Preview, Section, Text } from "@react-email/components";
import { getTranslations } from "next-intl/server";
import { InfoBox, OtpSection } from "../components/alert-box";
import { EmailButton } from "../components/email-button";
import { EmailContainer } from "../components/email-container";
import { EmailFooter } from "../components/email-footer";
import { EmailHeader } from "../components/email-header";

export interface InviteEmailProps {
  confirmationUrl: string;
  locale?: string;
  token: string;
}

/**
 * Invite email template for user invitations
 * Sent when a user is invited to join Bingify
 */
export async function InviteEmail({
  confirmationUrl,
  locale = "en",
  token,
}: InviteEmailProps) {
  const t = await getTranslations({
    locale,
    namespace: "EmailTemplates.invite",
  });

  return (
    <Html lang={locale}>
      <Preview>{t("subject")}</Preview>
      <Body style={bodyStyle}>
        <EmailContainer>
          <EmailHeader title={t("title")} />

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{t("greeting")}</Text>
            <Text style={textStyle}>{t("joinMessage")}</Text>

            <EmailButton href={confirmationUrl} text={t("buttonText")} />

            <InfoBox>
              <Text style={infoTitleStyle}>{t("featuresTitle")}</Text>
              <Text style={listItemStyle}>• {t("feature1")}</Text>
              <Text style={listItemStyle}>• {t("feature2")}</Text>
              <Text style={listItemStyle}>• {t("feature3")}</Text>
            </InfoBox>

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

const infoTitleStyle = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "600" as const,
  margin: "0 0 10px 0",
};

const listItemStyle = {
  color: "#333333",
  fontSize: "14px",
  margin: "5px 0",
};

const footerTextStyle = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0",
};

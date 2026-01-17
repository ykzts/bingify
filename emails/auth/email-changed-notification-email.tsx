import { Body, Html, Preview, Section, Text } from "@react-email/components";
import { getTranslations } from "next-intl/server";
import { InfoBox, SuccessBox } from "../components/alert-box";
import { EmailContainer } from "../components/email-container";
import { EmailFooter } from "../components/email-footer";
import { EmailHeader } from "../components/email-header";

export interface EmailChangedNotificationEmailProps {
  locale?: string;
  newEmail: string;
}

/**
 * Email changed notification email template
 * Sent to confirm that the email address has been successfully changed
 */
export async function EmailChangedNotificationEmail({
  locale = "en",
  newEmail,
}: EmailChangedNotificationEmailProps) {
  const t = await getTranslations({
    locale,
    namespace: "EmailTemplates.emailChangedNotification",
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
              <Text style={newEmailTextStyle}>
                {t("newEmailMessage", { newEmail })}
              </Text>
            </SuccessBox>

            <InfoBox>
              <Text style={infoTitleStyle}>{t("accountSecurityLabel")}</Text>
              <Text style={listItemStyle}>• {t("checklistItem1")}
              </Text>
              <Text style={listItemStyle}>• {t("checklistItem2")}
              </Text>
              <Text style={listItemStyle}>• {t("checklistItem3")}
              </Text>
            </InfoBox>
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
  margin: "0 0 10px 0",
};

const newEmailTextStyle = {
  color: "#166534",
  fontSize: "14px",
  margin: "0",
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

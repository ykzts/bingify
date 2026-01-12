import { Body, Html, Preview, Section, Text } from "@react-email/components";
import { OtpSection, WarningBox } from "../components/alert-box";
import { EmailButton } from "../components/email-button";
import { EmailContainer } from "../components/email-container";
import { EmailFooter } from "../components/email-footer";
import { EmailHeader } from "../components/email-header";

export interface EmailChangeEmailProps {
  confirmationUrl: string;
  locale?: string;
  token: string;
}

/**
 * Email change email template for secure email address change
 * Sent when a user requests to change their email address
 */
export function EmailChangeEmail({
  confirmationUrl,
  locale = "en",
  token,
}: EmailChangeEmailProps) {
  const isJa = locale === "ja";

  const subject = isJa
    ? "メールアドレス変更の確認"
    : "Confirm Your Email Change";
  const greeting = isJa ? "こんにちは、" : "Hello,";
  const warningTitle = isJa
    ? "メールアドレス変更リクエスト"
    : "Email Change Request";
  const securityWarning = isJa
    ? "Bingifyアカウントに関連付けられたメールアドレスを変更するリクエストが検出されました。これに心当たりがない場合は、すぐにアカウントを保護してください。"
    : "We noticed a request to change the email address associated with your Bingify account. If this wasn't you, please secure your account immediately.";
  const buttonText = isJa ? "メールアドレス変更を確認" : "Confirm Email Change";
  const ignoredMessage = isJa
    ? "このメールに心当たりがない場合は、無視していただいて構いません。"
    : "If you didn't request this change, please ignore this email.";

  return (
    <Html lang={isJa ? "ja" : "en"}>
      <Preview>{subject}</Preview>
      <Body style={bodyStyle}>
        <EmailContainer>
          <EmailHeader title={subject} />

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{greeting}</Text>

            <WarningBox>
              <Text style={warningTitleStyle}>
                <strong>{warningTitle}</strong>
              </Text>
              <Text style={warningTextStyle}>{securityWarning}</Text>
            </WarningBox>

            <EmailButton href={confirmationUrl} text={buttonText} />

            <OtpSection code={token} />

            <Text style={footerTextStyle}>{ignoredMessage}</Text>
          </Section>

          <EmailFooter companyName="Bingify" />
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

const warningTitleStyle = {
  color: "#991b1b",
  fontSize: "14px",
  margin: "0 0 5px 0",
};

const warningTextStyle = {
  color: "#991b1b",
  fontSize: "14px",
  margin: "0",
};

const footerTextStyle = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0",
};

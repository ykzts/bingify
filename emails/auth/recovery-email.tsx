import { Body, Html, Preview, Section, Text } from "@react-email/components";
import { OtpSection, WarningBox } from "../components/alert-box";
import { EmailButton } from "../components/email-button";
import { EmailContainer } from "../components/email-container";
import { EmailFooter } from "../components/email-footer";
import { EmailHeader } from "../components/email-header";

export interface RecoveryEmailProps {
  confirmationUrl: string;
  locale?: string;
  token: string;
}

/**
 * Recovery email template for password reset
 * Sent when a user requests to reset their password
 */
export function RecoveryEmail({
  confirmationUrl,
  locale = "en",
  token,
}: RecoveryEmailProps) {
  const isJa = locale === "ja";

  const subject = isJa ? "パスワードのリセット" : "Reset Your Password";
  const greeting = isJa ? "こんにちは、" : "Hello,";
  const text = isJa
    ? "パスワードのリセットリクエストを受け付けました。以下のボタンをクリックして、新しいパスワードを設定してください。"
    : "We received a request to reset your password. Click the button below to set a new password.";
  const buttonText = isJa ? "パスワードをリセット" : "Reset Password";
  const securityNoticeTitle = isJa
    ? "セキュリティのお知らせ"
    : "Security Notice";
  const securityWarning = isJa
    ? "このリクエストに心当たりがない場合は、誰かがあなたのアカウントにアクセスしようとしている可能性があります。このメールを無視し、パスワードを変更することをお勧めします。"
    : "If you didn't request this password reset, someone may be trying to access your account. Please ignore this email and consider changing your password.";
  const ignoredMessage = isJa
    ? "このメールに心当たりがない場合は、無視していただいて構いません。"
    : "If you didn't request this email, you can safely ignore it.";

  return (
    <Html lang={isJa ? "ja" : "en"}>
      <Preview>{subject}</Preview>
      <Body style={bodyStyle}>
        <EmailContainer>
          <EmailHeader title={subject} />

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{greeting}</Text>
            <Text style={textStyle}>{text}</Text>

            <EmailButton href={confirmationUrl} text={buttonText} />

            <OtpSection code={token} locale={locale} />

            <WarningBox>
              <Text style={warningTitleStyle}>
                <strong>{securityNoticeTitle}</strong>
              </Text>
              <Text style={warningTextStyle}>{securityWarning}</Text>
            </WarningBox>

            <Text style={footerTextStyle}>{ignoredMessage}</Text>
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

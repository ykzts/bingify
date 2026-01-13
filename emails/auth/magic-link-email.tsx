import { Body, Html, Preview, Section, Text } from "@react-email/components";
import { OtpSection } from "../components/alert-box";
import { EmailButton } from "../components/email-button";
import { EmailContainer } from "../components/email-container";
import { EmailFooter } from "../components/email-footer";
import { EmailHeader } from "../components/email-header";

export interface MagicLinkEmailProps {
  confirmationUrl: string;
  locale?: string;
  token: string;
}

/**
 * Magic link email template for passwordless authentication
 * Sent when a user requests to sign in using a magic link
 */
export function MagicLinkEmail({
  confirmationUrl,
  locale = "en",
  token,
}: MagicLinkEmailProps) {
  const isJa = locale === "ja";

  const subject = isJa ? "Bingifyにログイン" : "Sign In to Bingify";
  const greeting = isJa ? "こんにちは、" : "Hello,";
  const text = isJa
    ? "ログインリクエストを受け付けました。以下のボタンをクリックしてログインしてください。"
    : "We received a request to sign in to your account. Click the button below to sign in.";
  const buttonText = isJa ? "ログイン" : "Sign In";
  const securityNote = isJa
    ? "このリクエストに心当たりがない場合は、このメールを無視してください。"
    : "If you didn't request this sign-in link, you can safely ignore this email.";
  const expirationNote = isJa
    ? "このリンクは1時間後に有効期限が切れます。期限切れの場合は、再度ログインをリクエストしてください。"
    : "This link will expire in 1 hour. If it has expired, please request a new sign-in link.";

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

            <Text style={footerTextStyle}>{securityNote}</Text>
            <Text style={footerTextStyle}>{expirationNote}</Text>
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

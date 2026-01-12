import { Body, Html, Preview, Section, Text } from "@react-email/components";
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
export function ConfirmationEmail({
  confirmationUrl,
  locale = "en",
  token,
}: ConfirmationEmailProps) {
  const isJa = locale === "ja";

  const subject = isJa ? "メールアドレスの確認" : "Confirm Your Email";
  const greeting = isJa ? "こんにちは！" : "Hello!";
  const welcomeText = isJa
    ? "Bingifyへのご登録ありがとうございます。以下のボタンをクリックして、メールアドレスを確認してください。"
    : "Thank you for signing up for Bingify. Please click the button below to confirm your email address.";
  const buttonText = isJa ? "メールアドレスを確認" : "Confirm Email";
  const ignoredMessage = isJa
    ? "このメールに心当たりがない場合は、無視していただいて構いません。"
    : "If you didn't request this email, you can safely ignore it.";

  return (
    <Html lang={isJa ? "ja" : "en"}>
      <Preview>{subject}</Preview>
      <Body style={bodyStyle}>
        <EmailContainer>
          <EmailHeader
            title={isJa ? "Bingifyへようこそ" : "Welcome to Bingify"}
          />

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{greeting}</Text>
            <Text style={textStyle}>{welcomeText}</Text>

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

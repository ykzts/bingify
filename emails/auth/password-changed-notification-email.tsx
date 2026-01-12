import { Body, Html, Preview, Section, Text } from "@react-email/components";
import { InfoBox, SuccessBox } from "../components/alert-box";
import { EmailContainer } from "../components/email-container";
import { EmailFooter } from "../components/email-footer";
import { EmailHeader } from "../components/email-header";

export interface PasswordChangedNotificationEmailProps {
  locale?: string;
}

/**
 * Password changed notification email template
 * Sent to confirm that the password has been successfully changed
 */
export function PasswordChangedNotificationEmail({
  locale = "en",
}: PasswordChangedNotificationEmailProps) {
  const isJa = locale === "ja";

  const subject = isJa
    ? "パスワードが変更されました"
    : "Your Password Has Been Changed";
  const greeting = isJa ? "こんにちは、" : "Hello,";
  const successMessage = isJa
    ? "パスワードが正常に変更されました。新しいパスワードでサインインできるようになりました。"
    : "Your password has been successfully changed. You can now sign in with your new password.";
  const passwordSecurityLabel = isJa
    ? "パスワードセキュリティのコツ"
    : "Password Security Tips";
  const securityTip1 = isJa
    ? "強力なパスワードを使用（8文字以上、大文字と小文字、数字、記号を含める）"
    : "Use a strong password (8+ characters, mixed case, numbers, and symbols)";
  const securityTip2 = isJa
    ? "パスワードを誰とも共有しない"
    : "Never share your password with anyone";
  const securityTip3 = isJa
    ? "セキュリティを強化するために二要素認証を有効にする"
    : "Enable two-factor authentication for extra security";

  return (
    <Html lang={isJa ? "ja" : "en"}>
      <Preview>{subject}</Preview>
      <Body style={bodyStyle}>
        <EmailContainer>
          <EmailHeader title={subject} />

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{greeting}</Text>

            <SuccessBox>
              <Text style={successTextStyle}>{successMessage}</Text>
            </SuccessBox>

            <InfoBox>
              <Text style={infoTitleStyle}>{passwordSecurityLabel}</Text>
              <Text style={listItemStyle}>• {securityTip1}</Text>
              <Text style={listItemStyle}>• {securityTip2}</Text>
              <Text style={listItemStyle}>• {securityTip3}</Text>
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

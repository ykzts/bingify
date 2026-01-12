import { Body, Html, Preview, Section, Text } from "@react-email/components";
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
export function EmailChangedNotificationEmail({
  locale = "en",
  newEmail,
}: EmailChangedNotificationEmailProps) {
  const isJa = locale === "ja";

  const subject = isJa
    ? "メールアドレスが変更されました"
    : "Email Address Changed";
  const greeting = isJa ? "こんにちは、" : "Hello,";
  const successMessage = isJa
    ? "メールアドレスが正常に変更されました。新しいメールアドレスを使用してサインインできるようになりました。"
    : "Your email address has been successfully changed. You can now use your new email to sign in.";
  const newEmailMessage = isJa
    ? `新しいメールアドレス：${newEmail}`
    : `Your new email address is: ${newEmail}`;
  const accountSecurityLabel = isJa
    ? "アカウントセキュリティ"
    : "Account Security";
  const checklistItem1 = isJa
    ? "アカウント設定で二要素認証を有効にする"
    : "Enable two-factor authentication in your account settings";
  const checklistItem2 = isJa
    ? "最近のログイン履歴を確認する"
    : "Review your recent login activity";
  const checklistItem3 = isJa
    ? "セキュリティ設定を更新する"
    : "Update your security settings";

  return (
    <Html lang={isJa ? "ja" : "en"}>
      <Preview>{subject}</Preview>
      <Body style={bodyStyle}>
        <EmailContainer>
          <EmailHeader
            title={
              isJa
                ? "メールアドレス変更が確認されました"
                : "Email Change Confirmed"
            }
          />

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{greeting}</Text>

            <SuccessBox>
              <Text style={successTextStyle}>{successMessage}</Text>
              <Text style={newEmailTextStyle}>{newEmailMessage}</Text>
            </SuccessBox>

            <InfoBox>
              <Text style={infoTitleStyle}>{accountSecurityLabel}</Text>
              <Text style={listItemStyle}>• {checklistItem1}</Text>
              <Text style={listItemStyle}>• {checklistItem2}</Text>
              <Text style={listItemStyle}>• {checklistItem3}</Text>
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

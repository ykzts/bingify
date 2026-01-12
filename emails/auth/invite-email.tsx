import { Body, Html, Preview, Section, Text } from "@react-email/components";
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
export function InviteEmail({
  confirmationUrl,
  locale = "en",
  token,
}: InviteEmailProps) {
  const isJa = locale === "ja";

  const subject = isJa ? "Bingifyへのお招待" : "You're Invited to Bingify";
  const greeting = isJa ? "こんにちは！" : "Hello!";
  const joinMessage = isJa
    ? "Bingifyへの招待を受け取りました。以下のボタンをクリックして、招待を受け入れて、アカウントを作成してください。"
    : "You have been invited to join Bingify! Click the button below to accept the invitation and create your account.";
  const buttonText = isJa ? "Bingifyに参加する" : "Join Bingify";
  const featuresTitle = isJa ? "Bingifyの機能" : "Features of Bingify";
  const feature1 = isJa
    ? "リアルタイムでビンゴゲームを作成して共有"
    : "Create and share bingo games in real-time";
  const feature2 = isJa
    ? "配信者とコミュニティに最適"
    : "Perfect for streamers and communities";
  const feature3 = isJa
    ? "美しく直感的なインターフェース"
    : "Beautiful, intuitive interface";
  const ignoredMessage = isJa
    ? "このメールに心当たりがない場合は、無視していただいて構いません。"
    : "If you didn't request this invitation, you can safely ignore it.";

  return (
    <Html lang={isJa ? "ja" : "en"}>
      <Preview>{subject}</Preview>
      <Body style={bodyStyle}>
        <EmailContainer>
          <EmailHeader title={isJa ? "Bingifyへのお招待" : "You're Invited"} />

          <Section style={contentStyle}>
            <Text style={greetingStyle}>{greeting}</Text>
            <Text style={textStyle}>{joinMessage}</Text>

            <EmailButton href={confirmationUrl} text={buttonText} />

            <InfoBox>
              <Text style={infoTitleStyle}>{featuresTitle}</Text>
              <Text style={listItemStyle}>• {feature1}</Text>
              <Text style={listItemStyle}>• {feature2}</Text>
              <Text style={listItemStyle}>• {feature3}</Text>
            </InfoBox>

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

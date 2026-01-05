import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface ContactFormEmailProps {
  email: string;
  message: string;
  name: string;
}

/**
 * Contact form email template
 * Renders email notifications sent to administrators when users submit the contact form
 */
export function ContactFormEmail({
  email,
  message,
  name,
}: ContactFormEmailProps) {
  // プレビューテキスト: メールクライアントのプレビューに表示される
  const previewText = `${name}様からお問い合わせがありました`;

  return (
    <Html lang="ja">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>お問い合わせ</Heading>
          <Section style={section}>
            <Text style={label}>
              <strong>名前:</strong>
            </Text>
            <Text style={text}>{name}</Text>
          </Section>
          <Section style={section}>
            <Text style={label}>
              <strong>メールアドレス:</strong>
            </Text>
            <Text style={text}>{email}</Text>
          </Section>
          <Section style={section}>
            <Text style={label}>
              <strong>本文:</strong>
            </Text>
            <Text style={text}>{message}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ContactFormEmail;

// スタイル定義
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0f0f0",
  borderRadius: "5px",
  margin: "40px auto",
  maxWidth: "600px",
  padding: "20px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 20px",
  padding: "0",
};

const section = {
  margin: "0 0 20px",
};

const label = {
  color: "#333",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 5px",
};

const text = {
  color: "#555",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

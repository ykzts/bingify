import { Heading, Section } from "@react-email/components";

interface EmailHeaderProps {
  title: string;
}

/**
 * Email header component with purple gradient styling
 * Used at the top of all authentication emails
 */
export function EmailHeader({ title }: EmailHeaderProps) {
  return (
    <Section style={headerStyle}>
      <Heading style={headingStyle}>{title}</Heading>
    </Section>
  );
}

const headerStyle = {
  background: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
  color: "#ffffff",
  padding: "40px 20px",
  textAlign: "center" as const,
};

const headingStyle = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "600" as const,
  margin: "0",
};

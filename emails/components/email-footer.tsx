import { Section, Text } from "@react-email/components";

interface EmailFooterProps {
  companyName?: string;
  copyrightYear?: number;
}

/**
 * Email footer component with Bingify branding
 * Includes copyright text and company information
 */
export function EmailFooter({
  companyName = "Bingify",
  copyrightYear = new Date().getFullYear(),
}: EmailFooterProps) {
  return (
    <Section style={footerStyle}>
      <Text style={footerText}>
        © {copyrightYear} {companyName}. All rights reserved.
      </Text>
      <Text style={footerLinkText}>
        {companyName} is a service for sharing bingo games with friends and
        family.
      </Text>
    </Section>
  );
}

const footerStyle = {
  backgroundColor: "#f9fafb",
  borderTop: "1px solid #e5e7eb",
  padding: "20px 30px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 10px 0",
};

const footerLinkText = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0",
};

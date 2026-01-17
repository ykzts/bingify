import { Section, Text } from "@react-email/components";
import { getTranslations } from "next-intl/server";

interface EmailFooterProps {
  companyName?: string;
  copyrightYear?: number;
  locale?: string;
}

/**
 * Email footer component with Bingify branding
 * Includes copyright text and company information
 */
export async function EmailFooter({
  companyName = "Bingify",
  copyrightYear = new Date().getFullYear(),
  locale = "en",
}: EmailFooterProps) {
  const t = await getTranslations({
    locale,
    namespace: "EmailTemplates.footer",
  });

  return (
    <Section style={footerStyle}>
      <Text style={footerText}>
        © {copyrightYear} {companyName}. {t("rights")}.
      </Text>
      <Text style={footerLinkText}>{t("description")}</Text>
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

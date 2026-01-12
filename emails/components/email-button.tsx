import { Link, Section } from "@react-email/components";

interface EmailButtonProps {
  href: string;
  text: string;
}

/**
 * CTA button component for emails
 * Uses purple styling consistent with Bingify branding
 */
export function EmailButton({ href, text }: EmailButtonProps) {
  return (
    <Section style={buttonContainerStyle}>
      <Link href={href} style={buttonStyle}>
        {text}
      </Link>
    </Section>
  );
}

const buttonContainerStyle = {
  margin: "30px 0",
  textAlign: "center" as const,
};

const buttonStyle = {
  backgroundColor: "#a78bfa",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600" as const,
  padding: "14px 40px",
  textDecoration: "none" as const,
};

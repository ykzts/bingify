import { Container } from "@react-email/components";

interface EmailContainerProps {
  children: React.ReactNode;
}

/**
 * Base container component for email templates
 * Provides consistent width and styling across all emails
 */
export function EmailContainer({ children }: EmailContainerProps) {
  return <Container style={containerStyle}>{children}</Container>;
}

const containerStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden" as const,
};

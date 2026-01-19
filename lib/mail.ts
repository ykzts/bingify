import { render, toPlainText } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import nodemailer from "nodemailer";
import type { ReactNode } from "react";
import React from "react";
import { ContactFormEmail } from "@/emails/contact-form-email";
import type { AdminEmailInfo } from "@/lib/data/profiles";
import { getSmtpSettingsOrEnv } from "@/lib/data/smtp-settings";

/**
 * Create SMTP transporter for sending emails
 * Reads configuration from database with fallback to environment variables
 */
async function createTransporter() {
  const config = await getSmtpSettingsOrEnv();

  return nodemailer.createTransport({
    auth: config.auth,
    host: config.host,
    port: config.port,
    secure: config.secure,
  });
}

export interface ContactEmailOptions {
  email: string;
  message: string;
  name: string;
  recipients: AdminEmailInfo[];
}

export interface AuthEmailOptions {
  recipient: string;
  subject: string;
  template: ReactNode;
}

/**
 * Get localized subject for contact email using translation system
 */
async function getLocalizedSubject(
  name: string,
  locale: string
): Promise<string> {
  const t = await getTranslations({
    locale,
    namespace: "EmailTemplates.contactForm",
  });
  return t("subject", { name });
}

/**
 * Send contact form email to administrators
 * User's email is set in Reply-To header for easy replies
 * Sends localized emails based on each admin's locale preference
 */
export async function sendContactEmail(options: ContactEmailOptions) {
  const { email, message, name, recipients } = options;

  const config = await getSmtpSettingsOrEnv();
  const mailFrom = config.from;

  if (!mailFrom) {
    throw new Error("Mail configuration is missing");
  }

  if (recipients.length === 0) {
    throw new Error("No recipients provided");
  }

  const transporter = await createTransporter();

  // Send personalized emails to each admin based on their locale
  await Promise.all(
    recipients.map(async (recipient) => {
      const { address, locale } = recipient;

      // React Emailを使用してHTMLとテキスト版を自動生成
      const emailHtml = await render(
        React.createElement(ContactFormEmail, {
          email,
          locale,
          message,
          name,
        })
      );

      const emailText = toPlainText(emailHtml);
      const subject = await getLocalizedSubject(name, locale);

      const mailOptions = {
        from: mailFrom,
        html: emailHtml,
        replyTo: email,
        subject,
        text: emailText,
        to: address,
      };

      await transporter.sendMail(mailOptions);
    })
  );
}

/**
 * Send authentication email using React Email template
 * Used for email confirmations, password resets, etc.
 */
export async function sendAuthEmail(options: AuthEmailOptions) {
  const { recipient, subject, template } = options;

  const config = await getSmtpSettingsOrEnv();
  const mailFrom = config.from;

  if (!mailFrom) {
    throw new Error("Mail configuration is missing");
  }

  const transporter = await createTransporter();

  // React Emailを使用してHTMLとテキスト版を自動生成
  const emailHtml = await render(template);
  const emailText = toPlainText(emailHtml);

  // 開発環境でのデバッグロギング（DEBUG_EMAIL_LOG が有効な場合）
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEBUG_EMAIL_LOG === "true"
  ) {
    console.log("📬 Generated auth email", {
      subject,
      to: recipient,
    });
  }

  const mailOptions = {
    from: mailFrom,
    html: emailHtml,
    subject,
    text: emailText,
    to: recipient,
  };

  await transporter.sendMail(mailOptions);
}

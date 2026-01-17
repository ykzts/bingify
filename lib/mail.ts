import { render, toPlainText } from "@react-email/render";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type { ReactNode } from "react";
import React from "react";
import { ContactFormEmail } from "@/emails/contact-form-email";
import type { AdminEmailInfo } from "@/lib/data/profiles";

/**
 * Create SMTP transporter for sending emails
 */
function createTransporter() {
  const config = {
    auth: {
      pass: process.env.SMTP_PASS,
      user: process.env.SMTP_USER,
    },
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
  };

  return nodemailer.createTransport(config);
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
 * Get localized subject for contact email
 */
function getLocalizedSubject(name: string, locale: string): string {
  if (locale === "en") {
    return `[Contact Form] From ${name}`;
  }
  return `【お問い合わせ】${name}様より`;
}

/**
 * Send contact form email to administrators
 * User's email is set in Reply-To header for easy replies
 * Sends localized emails based on each admin's locale preference
 */
export async function sendContactEmail(options: ContactEmailOptions) {
  const { email, message, name, recipients } = options;

  const mailFrom = process.env.MAIL_FROM;

  if (!mailFrom) {
    throw new Error("Mail configuration is missing");
  }

  if (recipients.length === 0) {
    throw new Error("No recipients provided");
  }

  const transporter = createTransporter();

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

      const mailOptions = {
        from: mailFrom,
        html: emailHtml,
        replyTo: email,
        subject: getLocalizedSubject(name, locale),
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

  const mailFrom = process.env.MAIL_FROM;

  if (!mailFrom) {
    throw new Error("Mail configuration is missing");
  }

  const transporter = createTransporter();

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

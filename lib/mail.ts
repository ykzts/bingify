import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { escapeHtml } from "@/lib/utils/escape-html";

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
  recipients: Array<string | Mail.Address>;
}

/**
 * Send contact form email to administrators
 * User's email is set in Reply-To header for easy replies
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

  // Escape user inputs to prevent HTML injection
  const escapedName = escapeHtml(name);
  const escapedEmail = escapeHtml(email);
  const escapedMessage = escapeHtml(message).replace(/\n/g, "<br>");

  const mailOptions = {
    from: mailFrom,
    html: `
      <h2>お問い合わせ</h2>
      <p><strong>名前:</strong> ${escapedName}</p>
      <p><strong>メールアドレス:</strong> ${escapedEmail}</p>
      <p><strong>本文:</strong></p>
      <p>${escapedMessage}</p>
    `,
    replyTo: email,
    subject: `【お問い合わせ】${name}様より`,
    text: `
お問い合わせ

名前: ${name}
メールアドレス: ${email}

本文:
${message}
    `,
    to: recipients,
  };

  await transporter.sendMail(mailOptions);
}

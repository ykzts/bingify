import nodemailer from "nodemailer";
import { escapeHtml } from "./utils";

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
}

/**
 * Send contact form email to administrator
 * User's email is set in Reply-To header for easy replies
 */
export async function sendContactEmail(options: ContactEmailOptions) {
  const { email, message, name } = options;

  const mailFrom = process.env.MAIL_FROM;
  const mailTo = process.env.CONTACT_MAIL_TO;

  if (!(mailFrom && mailTo)) {
    throw new Error("Mail configuration is missing");
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
    to: mailTo,
  };

  await transporter.sendMail(mailOptions);
}

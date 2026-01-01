import nodemailer from "nodemailer";

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

  const mailOptions = {
    from: mailFrom,
    html: `
      <h2>お問い合わせ</h2>
      <p><strong>名前:</strong> ${name}</p>
      <p><strong>メールアドレス:</strong> ${email}</p>
      <p><strong>本文:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
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

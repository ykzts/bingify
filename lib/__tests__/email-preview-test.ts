import { render } from "@react-email/render";
import { ContactFormEmail } from "../emails/contact-form-email";
import { writeFileSync } from "fs";

const testData = {
  name: "山田太郎",
  email: "yamada@example.com",
  message: "サービスについてお問い合わせがあります。\n\n料金プランの詳細を教えていただけますでしょうか？\nよろしくお願いいたします。"
};

(async () => {
  const html = await render(ContactFormEmail(testData));
  const text = await render(ContactFormEmail(testData), { plainText: true });
  
  writeFileSync("/tmp/email-preview.html", html);
  writeFileSync("/tmp/email-preview.txt", text);
  
  console.log("Generated preview files");
})();

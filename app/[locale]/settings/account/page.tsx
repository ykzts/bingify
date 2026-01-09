import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function AccountSettingsPage({
  params,
}: PageProps<"/[locale]/settings/account">) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Redirect to the new profile page
  redirect({ href: "/settings/profile", locale });
}

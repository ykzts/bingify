import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSpaceByShareKey } from "../spaces/actions";

interface Props {
  params: Promise<{ locale: string; shareKey: string }>;
}

export default async function ShareKeyPage({ params }: Props) {
  const { locale, shareKey } = await params;
  setRequestLocale(locale);

  // Resolve share key to space
  const space = await getSpaceByShareKey(shareKey);

  if (!space) {
    // Invalid share key, redirect to home with error
    redirect(`/${locale}?error=invalid_share_key`);
  }

  // Redirect to the space page
  redirect(`/${locale}/spaces/${space.id}`);
}

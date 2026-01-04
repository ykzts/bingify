import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { hasAdminUser } from "./_lib/actions";

export const dynamic = "force-dynamic";

async function getCurrentAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No authenticated user found");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("User is not an admin");
  }

  return user;
}

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  await connection();

  const { locale } = await params;
  setRequestLocale(locale);

  // Check if any admin exists in the system
  const adminExists = await hasAdminUser();
  if (!adminExists) {
    redirect(`/${locale}/setup`);
  }

  // Check if user is authenticated and has admin role
  try {
    await getCurrentAdminUser();
  } catch {
    redirect(`/${locale}/login?redirect=/admin`);
  }

  return (
    <div className="container mx-auto p-6">
      <AdminHeader />
      <AdminNav locale={locale} />
      {children}
    </div>
  );
}

function AdminHeader() {
  const t = useTranslations("Admin");

  return (
    <div className="mb-8">
      <h1 className="font-bold text-3xl">{t("dashboardTitle")}</h1>
      <p className="mt-2 text-gray-600">{t("subtitle")}</p>
    </div>
  );
}

function AdminNav({ locale }: { locale: string }) {
  const t = useTranslations("Admin");

  return (
    <nav className="mb-8 border-gray-200 border-b">
      <ul className="flex gap-6">
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            href={`/${locale}/admin`}
          >
            {t("navOverview")}
          </Link>
        </li>
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            href={`/${locale}/admin/spaces`}
          >
            {t("navSpaces")}
          </Link>
        </li>
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            href={`/${locale}/admin/users`}
          >
            {t("navUsers")}
          </Link>
        </li>
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            href={`/${locale}/admin/auth-providers`}
          >
            {t("navAuthProviders")}
          </Link>
        </li>
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            href={`/${locale}/admin/settings`}
          >
            {t("navSettings")}
          </Link>
        </li>
      </ul>
    </nav>
  );
}

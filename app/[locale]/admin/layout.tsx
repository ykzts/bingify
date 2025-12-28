import Link from "next/link";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { hasAdminUser } from "@/app/[locale]/admin/actions";
import { createClient } from "@/lib/supabase/server";

// Force dynamic rendering to ensure Supabase credentials are only required at runtime
// This allows the build to succeed even when environment variables are not available
export const dynamic = "force-dynamic";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Check if any admin exists in the system
  const adminExists = await hasAdminUser();
  if (!adminExists) {
    redirect(`/${locale}/setup`);
  }

  // Verify that the current user has admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect(`/${locale}/dashboard`);
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
            href={`/${locale}/admin/settings`}
          >
            {t("navSettings")}
          </Link>
        </li>
      </ul>
    </nav>
  );
}

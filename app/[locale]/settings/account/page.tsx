import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountLinkingForm } from "./_components/account-linking-form";

interface Props {
  params: Promise<{ locale: string }>;
}

async function AccountSettingsContent({ locale }: { locale: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  return <AccountLinkingForm user={user} />;
}

export default async function AccountSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          </div>
        }
      >
        <AccountSettingsContent locale={locale} />
      </Suspense>
    </div>
  );
}

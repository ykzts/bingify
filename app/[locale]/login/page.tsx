import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFE5E5] via-[#FFF4E5] to-[#E5F3FF]">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

import { setRequestLocale } from "next-intl/server";
import { CreateSpaceForm } from "./create-space-form";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CreateSpaceForm />;
}

import { getTranslations, setRequestLocale } from "next-intl/server";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export default async function UserSpacePage({ params }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("UserSpace");

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-4 font-bold text-3xl">{t("heading")}</h1>
      <p>
        {t("spaceId")}: {id}
      </p>
    </div>
  );
}

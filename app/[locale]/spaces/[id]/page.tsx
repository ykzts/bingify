import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpaceParticipation } from "./_components/space-participation";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export default async function UserSpacePage({ params }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("UserSpace");

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="mb-4 font-bold text-3xl">{t("heading")}</h1>
        <p className="text-gray-600">
          {t("spaceId")}: {id}
        </p>
        <SpaceParticipation spaceId={id} />
      </div>
    </div>
  );
}
